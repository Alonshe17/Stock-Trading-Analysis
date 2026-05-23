/**
 * 1-Day Buying Volume Scanner
 *
 * Finds stocks where TODAY's estimated buying volume is significantly
 * larger than YESTERDAY's — a sign of fresh institutional demand entering.
 *
 * Buying volume is estimated per-bar using the Closing Price Location formula:
 *   buyFrac  = (close − low) / (high − low)   [0 = all selling, 1 = all buying]
 *   buyVol   = totalVolume × buyFrac
 *
 * Signals:
 *   strong-buy    → buyVolRatio ≥ 3× AND price up ≥ 2%
 *   buy-surge     → buyVolRatio ≥ 2× AND price up
 *   buy-reversal  → buyVolRatio ≥ 2× AND price flat/down (potential bottoming)
 */

import { ensureYFSession, yfHeaders, withCrumb, yfSym } from './yfClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DayBuySignal = 'strong-buy' | 'buy-surge' | 'buy-reversal';

export type DayBuyVolumeResult = {
  symbol:        string;
  name:          string;
  price:         number;
  changePct:     number;      // today's price change %
  volume:        number;      // today's total volume
  avgVolume:     number;      // 3-month avg daily volume
  volRatio:      number;      // today vol / avg daily vol

  todayBuyVol:   number;      // estimated buying volume today
  prevBuyVol:    number;      // estimated buying volume yesterday
  buyVolRatio:   number;      // todayBuyVol / prevBuyVol  ← key metric

  todayBuyFrac:  number;      // today's buying pressure  (0–1)
  prevBuyFrac:   number;      // yesterday's buying pressure (0–1)

  // Bar OHLCV for the tooltip / expanded view
  todayOpen:  number;
  todayHigh:  number;
  todayLow:   number;
  todayClose: number;
  prevOpen:   number;
  prevHigh:   number;
  prevLow:    number;
  prevClose:  number;
  prevVolume: number;

  signal: DayBuySignal;
  score:  number;
};

// ── Batch quote (same pattern as weekly scanner) ──────────────────────────────

type QuickQuote = {
  symbol:     string;
  name:       string;
  price:      number;
  changePct:  number;
  volume:     number;
  avgVol10d:  number;
  avgVol3m:   number;
  marketCapM: number;
};

async function batchQuote(symbols: string[]): Promise<QuickQuote[]> {
  const syms   = symbols.map(yfSym).join(',');
  const fields = 'symbol,shortName,regularMarketPrice,regularMarketChangePercent,' +
    'regularMarketVolume,averageDailyVolume10Day,averageDailyVolume3Month,marketCap';

  for (const host of ['query2', 'query1']) {
    const base = `https://${host}.finance.yahoo.com/v7/finance/quote` +
      `?symbols=${encodeURIComponent(syms)}&fields=${fields}&lang=en-US&region=US`;
    try {
      const r = await fetch(withCrumb(base), { headers: yfHeaders(), cache: 'no-store' });
      if (!r.ok) continue;
      const json = await r.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = json?.quoteResponse?.result ?? [];
      const mapped = rows.map(q => ({
        symbol:     q.symbol as string,
        name:       (q.shortName ?? q.displayName ?? q.symbol) as string,
        price:      (q.regularMarketPrice ?? 0) as number,
        changePct:  (q.regularMarketChangePercent ?? 0) as number,
        volume:     (q.regularMarketVolume ?? 0) as number,
        avgVol10d:  (q.averageDailyVolume10Day ?? 0) as number,
        avgVol3m:   (q.averageDailyVolume3Month ?? 0) as number,
        marketCapM: ((q.marketCap ?? 0) as number) / 1_000_000,
      })).filter(q =>
        q.price >= 10 &&
        q.avgVol3m >= 500_000
      );
      if (mapped.length > 0) return mapped;
    } catch { /* try next host */ }
  }
  return [];
}

// ── 5-day OHLCV fetch ─────────────────────────────────────────────────────────

type OHLCVBar = {
  open: number; high: number; low: number; close: number; volume: number;
};

async function fetchRecentBars(symbol: string): Promise<OHLCVBar[]> {
  for (const host of ['query2', 'query1']) {
    const base =
      `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym(symbol))}` +
      `?interval=1d&range=5d&includePrePost=false`;
    try {
      const r = await fetch(withCrumb(base), { headers: yfHeaders(), cache: 'no-store' });
      if (!r.ok) continue;
      const json = await r.json();
      const res  = json?.chart?.result?.[0];
      if (!res) continue;
      const q = res.indicators?.quote?.[0] ?? {};
      const opens:   (number | null)[] = q.open   ?? [];
      const highs:   (number | null)[] = q.high   ?? [];
      const lows:    (number | null)[] = q.low    ?? [];
      const closes:  (number | null)[] = q.close  ?? [];
      const volumes: (number | null)[] = q.volume ?? [];

      const bars: OHLCVBar[] = opens
        .map((_, i) => ({
          open:   opens[i]   as number,
          high:   highs[i]   as number,
          low:    lows[i]    as number,
          close:  closes[i]  as number,
          volume: (volumes[i] as number) ?? 0,
        }))
        .filter(b => b.close != null && b.close > 0 && b.high > b.low);

      if (bars.length >= 2) return bars;
    } catch { /* try next host */ }
  }
  return [];
}

// ── Buying volume estimate ─────────────────────────────────────────────────────

function calcBuyVol(bar: OHLCVBar): { buyVol: number; buyFrac: number } {
  const range = bar.high - bar.low;
  // buyFrac: 0 = closed at low (all selling), 1 = closed at high (all buying)
  const buyFrac = range > 0.001 ? Math.max(0, Math.min(1, (bar.close - bar.low) / range)) : 0.5;
  return { buyVol: bar.volume * buyFrac, buyFrac };
}

// ── Signal + score ────────────────────────────────────────────────────────────

function classify(buyVolRatio: number, changePct: number): DayBuySignal {
  if (buyVolRatio >= 3 && changePct >= 2) return 'strong-buy';
  if (buyVolRatio >= 2 && changePct >= 0) return 'buy-surge';
  return 'buy-reversal'; // buyVolRatio >= 2 but price flat/down
}

function calcScore(signal: DayBuySignal, buyVolRatio: number, changePct: number): number {
  const base      = signal === 'strong-buy' ? 8 : signal === 'buy-surge' ? 6 : 4;
  const volBonus  = Math.min(2, Math.floor(buyVolRatio - 2));
  const priceBonus = changePct >= 5 ? 1 : 0;
  return Math.min(10, base + volBonus + priceBonus);
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export async function runDayBuyVolumeScanner(
  universe: string[],
  maxResults = 50,
): Promise<DayBuyVolumeResult[]> {

  // Phase 0: YF session
  await ensureYFSession();

  // Phase 1: batch-quote the universe (batches of 100, concurrency 3)
  const BATCH = 100;
  const CONC  = 3;
  const allQuotes: QuickQuote[] = [];

  for (let i = 0; i < universe.length; i += BATCH * CONC) {
    const chunks = [];
    for (let j = 0; j < CONC && i + j * BATCH < universe.length; j++) {
      chunks.push(universe.slice(i + j * BATCH, i + (j + 1) * BATCH));
    }
    const results = await Promise.all(chunks.map(c => batchQuote(c)));
    for (const r of results) allQuotes.push(...r);
    if (i + BATCH * CONC < universe.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Phase 2: pre-filter — stocks with elevated recent volume vs their 3m baseline
  // avgVol10d / avgVol3m > 1 means recent days were above average
  const candidates = allQuotes
    .filter(q => q.avgVol3m > 0 && q.avgVol10d > 0)
    .map(q => ({ ...q, recentRatio: q.avgVol10d / q.avgVol3m }))
    .sort((a, b) => b.recentRatio - a.recentRatio)
    .slice(0, 200);

  // Phase 3: fetch 2-day OHLCV for each candidate (concurrency 10)
  const CANDLE_CONC = 10;
  const results: DayBuyVolumeResult[] = [];

  for (let i = 0; i < candidates.length; i += CANDLE_CONC) {
    const batch      = candidates.slice(i, i + CANDLE_CONC);
    const barResults = await Promise.all(batch.map(q => fetchRecentBars(q.symbol)));

    for (let j = 0; j < batch.length; j++) {
      const qq   = batch[j];
      const bars = barResults[j];
      if (bars.length < 2) continue;

      const today = bars[bars.length - 1];
      const prev  = bars[bars.length - 2];

      const { buyVol: todayBuyVol, buyFrac: todayBuyFrac } = calcBuyVol(today);
      const { buyVol: prevBuyVol,  buyFrac: prevBuyFrac  } = calcBuyVol(prev);

      if (prevBuyVol <= 0) continue;
      const buyVolRatio = todayBuyVol / prevBuyVol;
      if (buyVolRatio < 2) continue;   // must at least double yesterday's buy volume

      // Also require meaningful buy pressure today (not just tiny absolute buying vol)
      if (todayBuyFrac < 0.35) continue; // still more selling than buying today
      if (today.volume < 200_000) continue; // minimum volume floor

      const signal = classify(buyVolRatio, qq.changePct);
      const score  = calcScore(signal, buyVolRatio, qq.changePct);
      const volRatio = qq.avgVol3m > 0 ? today.volume / qq.avgVol3m : 0;

      results.push({
        symbol:       qq.symbol,
        name:         qq.name,
        price:        today.close,
        changePct:    qq.changePct,
        volume:       today.volume,
        avgVolume:    qq.avgVol3m,
        volRatio,
        todayBuyVol,
        prevBuyVol,
        buyVolRatio,
        todayBuyFrac,
        prevBuyFrac,
        todayOpen:  today.open,
        todayHigh:  today.high,
        todayLow:   today.low,
        todayClose: today.close,
        prevOpen:   prev.open,
        prevHigh:   prev.high,
        prevLow:    prev.low,
        prevClose:  prev.close,
        prevVolume: prev.volume,
        signal,
        score,
      });
    }

    if (i + CANDLE_CONC < candidates.length) {
      await new Promise(r => setTimeout(r, 120));
    }
  }

  // Sort: strong-buy first, then by buyVolRatio descending
  const ORDER: Record<DayBuySignal, number> = {
    'strong-buy':   0,
    'buy-surge':    1,
    'buy-reversal': 2,
  };

  results.sort((a, b) => {
    const os = ORDER[a.signal] - ORDER[b.signal];
    if (os !== 0) return os;
    return b.buyVolRatio - a.buyVolRatio;
  });

  return results.slice(0, maxResults);
}
