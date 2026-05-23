/**
 * Debug endpoint — traces a single symbol through the 1D Buy Volume scanner
 * pipeline so we can see exactly which step filters it out.
 *
 * Usage:
 *   GET /api/scanner/debug?symbol=IONQ&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ensureYFSession, yfHeaders, withCrumb, yfSym } from '@/lib/yfClient';

export const dynamic    = 'force-dynamic';
export const maxDuration = 30;

function rangeForDates(start: string, end: string): string {
  const gap = (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000;
  if (gap <= 7)  return '10d';
  if (gap <= 30) return '1mo';
  if (gap <= 90) return '3mo';
  return '6mo';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol    = (searchParams.get('symbol') ?? 'IONQ').toUpperCase();
  const startDate = searchParams.get('startDate') ?? '';
  const endDate   = searchParams.get('endDate')   ?? '';

  const steps: Record<string, unknown> = {};

  await ensureYFSession();
  steps['0_session'] = 'YF session ready';

  // ── Step 1: batch quote ──────────────────────────────────────────────────────
  const fields = 'symbol,shortName,regularMarketPrice,regularMarketChangePercent,' +
    'regularMarketVolume,averageDailyVolume10Day,averageDailyVolume3Month,marketCap';
  const quoteUrl =
    `https://query2.finance.yahoo.com/v7/finance/quote` +
    `?symbols=${encodeURIComponent(yfSym(symbol))}&fields=${fields}&lang=en-US&region=US`;

  let quote: Record<string, unknown> | null = null;
  try {
    const r = await fetch(withCrumb(quoteUrl), { headers: yfHeaders(), cache: 'no-store' });
    const json = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = json?.quoteResponse?.result?.[0] ?? null;
    if (row) {
      quote = {
        symbol:     row.symbol,
        name:       row.shortName ?? row.displayName ?? row.symbol,
        price:      row.regularMarketPrice ?? 0,
        changePct:  row.regularMarketChangePercent ?? 0,
        volume:     row.regularMarketVolume ?? 0,
        avgVol10d:  row.averageDailyVolume10Day ?? 0,
        avgVol3m:   row.averageDailyVolume3Month ?? 0,
        marketCapM: ((row.marketCap ?? 0) as number) / 1_000_000,
      };
    }
    steps['1_quote_raw'] = json;   // show full raw response for debugging
    steps['1_quote'] = quote ?? 'NOT FOUND in quote API';
  } catch (e) {
    steps['1_quote'] = `ERROR: ${String(e)}`;
  }

  // ── Step 2: pre-filter check ─────────────────────────────────────────────────
  if (quote) {
    const price   = quote.price   as number;
    const avgVol3m = quote.avgVol3m as number;
    steps['2_prefilter'] = {
      price,
      avgVol3m,
      passesPrice:  price   >= 10,
      passesVolume: avgVol3m >= 500_000,
      passes:       price   >= 10 && avgVol3m >= 500_000,
      note: price < 10
        ? `❌ FILTERED: price $${price.toFixed(2)} < $10`
        : avgVol3m < 500_000
        ? `❌ FILTERED: avgVol3m ${avgVol3m.toLocaleString()} < 500K`
        : '✅ Passes pre-filter',
    };
  } else {
    steps['2_prefilter'] = '❌ FILTERED: not returned by quote API';
  }

  // ── Step 3: OHLCV fetch ───────────────────────────────────────────────────────
  const customDates = !!(startDate && endDate);
  const rangeParam  = customDates ? rangeForDates(startDate, endDate) : '5d';
  steps['3_range'] = { startDate, endDate, customDates, rangeParam };

  type Bar = {
    dateStr: string; dateLabel: string;
    open: number; high: number; low: number; close: number; volume: number;
    timestamp: number;
  };

  let bars: Bar[] = [];
  try {
    const barUrl =
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym(symbol))}` +
      `?interval=1d&range=${rangeParam}&includePrePost=false`;
    const r    = await fetch(withCrumb(barUrl), { headers: yfHeaders(), cache: 'no-store' });
    const json = await r.json();
    const res  = json?.chart?.result?.[0];
    const ts: number[]           = res?.timestamp ?? [];
    const q                      = res?.indicators?.quote?.[0] ?? {};
    const opens:  (number|null)[] = q.open   ?? [];
    const highs:  (number|null)[] = q.high   ?? [];
    const lows:   (number|null)[] = q.low    ?? [];
    const closes: (number|null)[] = q.close  ?? [];
    const vols:   (number|null)[] = q.volume ?? [];

    bars = ts.map((t, i) => {
      const d       = new Date(t * 1000);
      const yr      = d.getUTCFullYear();
      const mo      = d.getUTCMonth();
      const dy      = d.getUTCDate();
      const dateStr   = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
      const dayName   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()];
      const dateLabel = `${dayName} ${mo + 1}/${dy}`;
      return {
        dateStr, dateLabel, timestamp: t,
        open:   (opens[i]  as number) ?? 0,
        high:   (highs[i]  as number) ?? 0,
        low:    (lows[i]   as number) ?? 0,
        close:  (closes[i] as number) ?? 0,
        volume: (vols[i]   as number) ?? 0,
      };
    }).filter(b => b.close > 0 && b.high > b.low);

    steps['4_bars'] = {
      totalBarsReturned: bars.length,
      bars,
    };
  } catch (e) {
    steps['4_bars'] = `ERROR fetching bars: ${String(e)}`;
  }

  // ── Step 4: date matching ─────────────────────────────────────────────────────
  function findBar(targetDate: string): Bar | null {
    const exact = bars.find(b => b.dateStr === targetDate);
    if (exact) return exact;
    const before = bars.filter(b => b.dateStr < targetDate);
    return before.length > 0 ? before[before.length - 1] : null;
  }

  let endBar:   Bar | null = null;
  let startBar: Bar | null = null;

  if (customDates) {
    endBar   = findBar(endDate);
    startBar = findBar(startDate);
  } else if (bars.length >= 2) {
    endBar   = bars[bars.length - 1];
    startBar = bars[bars.length - 2];
  }

  steps['5_date_matching'] = {
    lookingForEndDate:   endDate   || '(last bar)',
    lookingForStartDate: startDate || '(second-to-last bar)',
    endBar:   endBar   ?? '❌ NOT FOUND in bars',
    startBar: startBar ?? '❌ NOT FOUND in bars',
    sameBarWarning: (endBar && startBar && endBar.dateStr === startBar.dateStr)
      ? '❌ Both dates resolved to the same bar'
      : null,
  };

  // ── Step 5: ratio computation ─────────────────────────────────────────────────
  if (endBar && startBar && endBar.dateStr !== startBar.dateStr) {
    const range1 = endBar.high - endBar.low;
    const endBuyFrac  = range1 > 0.001
      ? Math.max(0, Math.min(1, (endBar.close - endBar.low) / range1))
      : 0.5;

    const range2 = startBar.high - startBar.low;
    const startBuyFrac = range2 > 0.001
      ? Math.max(0, Math.min(1, (startBar.close - startBar.low) / range2))
      : 0.5;

    const todayBuyVol = endBar.volume   * endBuyFrac;
    const prevBuyVol  = startBar.volume * startBuyFrac;
    const buyVolRatio   = prevBuyVol > 0 ? todayBuyVol / prevBuyVol : 0;
    const totalVolRatio = startBar.volume > 0 ? endBar.volume / startBar.volume : 0;

    const changePct = startBar.close > 0
      ? ((endBar.close - startBar.close) / startBar.close) * 100
      : 0;

    const passesMain   = buyVolRatio >= 2 || totalVolRatio >= 2;
    const passesMinVol = endBar.volume >= 200_000;

    steps['6_ratios'] = {
      endBar:   { date: endBar.dateStr,   vol: endBar.volume,   buyFrac: endBuyFrac.toFixed(4),   buyVol: todayBuyVol.toFixed(0) },
      startBar: { date: startBar.dateStr, vol: startBar.volume, buyFrac: startBuyFrac.toFixed(4), buyVol: prevBuyVol.toFixed(0)  },
      changePct:     changePct.toFixed(2) + '%',
      buyVolRatio:   buyVolRatio.toFixed(4),
      totalVolRatio: totalVolRatio.toFixed(4),
      passesMain:    passesMain   ? '✅ buyVolRatio≥2 OR totalVolRatio≥2' : `❌ FILTERED: buyVolRatio=${buyVolRatio.toFixed(2)} totalVolRatio=${totalVolRatio.toFixed(2)} (both < 2)`,
      passesMinVol:  passesMinVol ? `✅ volume ${endBar.volume.toLocaleString()} ≥ 200K` : `❌ FILTERED: volume ${endBar.volume.toLocaleString()} < 200K`,
      wouldAppear:   passesMain && passesMinVol,
    };
  } else {
    steps['6_ratios'] = '❌ SKIPPED: could not find both bars';
  }

  return NextResponse.json({ symbol, steps }, { status: 200 });
}
