/**
 * 1-Day Buying Volume Scanner
 *
 * Compares estimated buying volume between two dates for each stock.
 * Default: end date = most recent trading day, start date = the one before it.
 * Custom:  any two YYYY-MM-DD dates up to 6 months apart.
 *
 * Buying volume is estimated per-bar using the Closing Price Location formula:
 *   buyFrac  = (close − low) / (high − low)   [0 = all selling, 1 = all buying]
 *   buyVol   = totalVolume × buyFrac
 *
 * Signals:
 *   strong-buy    → buyVolRatio ≥ 3× AND price change ≥ +2%
 *   buy-surge     → buyVolRatio ≥ 2× AND price change ≥ 0%
 *   buy-reversal  → buyVolRatio ≥ 2× AND price change < 0% (demand absorbing supply)
 */

import { ensureYFSession, yfHeaders, withCrumb, yfSym } from './yfClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DayBuySignal = 'strong-buy' | 'buy-surge' | 'buy-reversal';

export type DayBuyVolumeResult = {
  symbol:         string;
  name:           string;
  price:          number;
  changePct:      number;      // price change from startDate to endDate (%)
  volume:         number;      // end-date total volume
  avgVolume:      number;      // 3-month avg daily volume
  volRatio:       number;      // end-date vol / avg daily vol

  endDateLabel:   string;      // e.g. "Mon 5/19"
  startDateLabel: string;      // e.g. "Mon 5/12"

  todayBuyVol:    number;      // end-date estimated buying volume
  prevBuyVol:     number;      // start-date estimated buying volume
  buyVolRatio:    number;      // todayBuyVol / prevBuyVol  ← key metric

  todayBuyFrac:   number;      // end-date buying pressure (0–1)
  prevBuyFrac:    number;      // start-date buying pressure (0–1)

  // Bar OHLCV for the expanded view
  todayOpen:  number; todayHigh: number; todayLow: number; todayClose: number;
  prevOpen:   number; prevHigh:  number; prevLow:  number; prevClose:  number;
  prevVolume: number;

  signal: DayBuySignal;
  score:  number;
};

// ── Batch quote ───────────────────────────────────────────────────────────────

type QuickQuote = {
  symbol: string; name: string;
  price: number; changePct: number; volume: number;
  avgVol10d: number; avgVol3m: number; marketCapM: number;
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
      })).filter(q => q.price >= 10 && q.avgVol3m >= 500_000);
      if (mapped.length > 0) return mapped;
    } catch { /* try next host */ }
  }
  return [];
}

// ── OHLCV bar with date ───────────────────────────────────────────────────────

type OHLCVBar = {
  dateStr:   string;   // YYYY-MM-DD for matching
  dateLabel: string;   // "Mon 5/19" for display
  open: number; high: number; low: number; close: number; volume: number;
};

/** Pick YF range param based on calendar distance between two dates. */
function rangeForDates(start: string, end: string): string {
  const gap = (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000;
  if (gap <= 7)  return '10d';
  if (gap <= 30) return '1mo';
  if (gap <= 90) return '3mo';
  return '6mo';
}

async function fetchBarsWithDates(symbol: string, rangeParam: string): Promise<OHLCVBar[]> {
  for (const host of ['query2', 'query1']) {
    const base =
      `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym(symbol))}` +
      `?interval=1d&range=${rangeParam}&includePrePost=false`;
    try {
      const r = await fetch(withCrumb(base), { headers: yfHeaders(), cache: 'no-store' });
      if (!r.ok) continue;
      const json = await r.json();
      const res  = json?.chart?.result?.[0];
      if (!res) continue;
      const ts: number[]        = res.timestamp ?? [];
      const q                   = res.indicators?.quote?.[0] ?? {};
      const opens:  (number|null)[] = q.open   ?? [];
      const highs:  (number|null)[] = q.high   ?? [];
      const lows:   (number|null)[] = q.low    ?? [];
      const closes: (number|null)[] = q.close  ?? [];
      const vols:   (number|null)[] = q.volume ?? [];

      const bars: OHLCVBar[] = ts
        .map((t, i) => {
          // Use UTC so Vercel (UTC server) matches the user's intended date
          const d   = new Date(t * 1000);
          const yr  = d.getUTCFullYear();
          const mo  = d.getUTCMonth();
          const dy  = d.getUTCDate();
          const dateStr   = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
          const dayName   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()];
          const dateLabel = `${dayName} ${mo + 1}/${dy}`;
          return {
            dateStr, dateLabel,
            open:   opens[i]  as number,
            high:   highs[i]  as number,
            low:    lows[i]   as number,
            close:  closes[i] as number,
            volume: (vols[i]  as number) ?? 0,
          };
        })
        .filter(b => b.close != null && b.close > 0 && b.high > b.low);

      if (bars.length >= 2) return bars;
    } catch { /* try next host */ }
  }
  return [];
}

/**
 * Find the bar whose dateStr matches targetDate.
 * If there's no exact match (holiday / weekend), returns the last trading
 * day BEFORE targetDate that exists in the data.
 */
function findBarForDate(bars: OHLCVBar[], targetDate: string): OHLCVBar | null {
  const exact = bars.find(b => b.dateStr === targetDate);
  if (exact) return exact;
  // Nearest prior trading day
  const before = bars.filter(b => b.dateStr < targetDate);
  return before.length > 0 ? before[before.length - 1] : null;
}

// ── Buying volume estimate ────────────────────────────────────────────────────

function calcBuyVol(bar: OHLCVBar): { buyVol: number; buyFrac: number } {
  const range   = bar.high - bar.low;
  const buyFrac = range > 0.001 ? Math.max(0, Math.min(1, (bar.close - bar.low) / range)) : 0.5;
  return { buyVol: bar.volume * buyFrac, buyFrac };
}

// ── Signal + score ────────────────────────────────────────────────────────────

function classify(buyVolRatio: number, changePct: number): DayBuySignal {
  if (buyVolRatio >= 3 && changePct >= 2) return 'strong-buy';
  if (buyVolRatio >= 2 && changePct >= 0) return 'buy-surge';
  return 'buy-reversal';
}

function calcScore(signal: DayBuySignal, buyVolRatio: number, changePct: number): number {
  const base       = signal === 'strong-buy' ? 8 : signal === 'buy-surge' ? 6 : 4;
  const volBonus   = Math.min(2, Math.floor(buyVolRatio - 2));
  const priceBonus = changePct >= 5 ? 1 : 0;
  return Math.min(10, base + volBonus + priceBonus);
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export async function runDayBuyVolumeScanner(
  universe:   string[],
  maxResults = 50,
  endDate?:   string,   // YYYY-MM-DD — the "after" bar (defaults to latest trading day)
  startDate?: string,   // YYYY-MM-DD — the "before" bar (defaults to previous trading day)
): Promise<DayBuyVolumeResult[]> {

  const customDates = !!(startDate && endDate);
  const rangeParam  = customDates ? rangeForDates(startDate!, endDate!) : '5d';

  // Phase 0: YF session
  await ensureYFSession();

  // Phase 1: batch-quote the universe (batches of 100, concurrency 3)
  const BATCH = 100, CONC = 3;
  const allQuotes: QuickQuote[] = [];

  for (let i = 0; i < universe.length; i += BATCH * CONC) {
    const chunks = [];
    for (let j = 0; j < CONC && i + j * BATCH < universe.length; j++) {
      chunks.push(universe.slice(i + j * BATCH, i + (j + 1) * BATCH));
    }
    const batchRes = await Promise.all(chunks.map(c => batchQuote(c)));
    for (const r of batchRes) allQuotes.push(...r);
    if (i + BATCH * CONC < universe.length) await new Promise(r => setTimeout(r, 200));
  }

  // Phase 2: pre-filter by recent volume elevation
  const candidates = allQuotes
    .filter(q => q.avgVol3m > 0 && q.avgVol10d > 0)
    .map(q => ({ ...q, recentRatio: q.avgVol10d / q.avgVol3m }))
    .sort((a, b) => b.recentRatio - a.recentRatio)
    .slice(0, 200);

  // Phase 3: fetch OHLCV bars and compute buying volume for the two dates
  const CANDLE_CONC = 10;
  const results: DayBuyVolumeResult[] = [];

  for (let i = 0; i < candidates.length; i += CANDLE_CONC) {
    const batch      = candidates.slice(i, i + CANDLE_CONC);
    const barResults = await Promise.all(batch.map(q => fetchBarsWithDates(q.symbol, rangeParam)));

    for (let j = 0; j < batch.length; j++) {
      const qq   = batch[j];
      const bars = barResults[j];
      if (bars.length < 2) continue;

      let endBar:   OHLCVBar;
      let startBar: OHLCVBar;

      if (customDates) {
        const eb = findBarForDate(bars, endDate!);
        const sb = findBarForDate(bars, startDate!);
        if (!eb || !sb || eb.dateStr === sb.dateStr) continue;
        endBar   = eb;
        startBar = sb;
      } else {
        endBar   = bars[bars.length - 1];
        startBar = bars[bars.length - 2];
      }

      // Price change between the two bars
      const changePct = startBar.close > 0
        ? ((endBar.close - startBar.close) / startBar.close) * 100
        : 0;

      const { buyVol: todayBuyVol, buyFrac: todayBuyFrac } = calcBuyVol(endBar);
      const { buyVol: prevBuyVol,  buyFrac: prevBuyFrac  } = calcBuyVol(startBar);

      if (prevBuyVol <= 0) continue;
      const buyVolRatio = todayBuyVol / prevBuyVol;
      if (buyVolRatio < 2)   continue;
      if (todayBuyFrac < 0.35) continue;
      if (endBar.volume < 200_000) continue;

      const signal   = classify(buyVolRatio, changePct);
      const score    = calcScore(signal, buyVolRatio, changePct);
      const volRatio = qq.avgVol3m > 0 ? endBar.volume / qq.avgVol3m : 0;

      results.push({
        symbol:         qq.symbol,
        name:           qq.name,
        price:          endBar.close,
        changePct,
        volume:         endBar.volume,
        avgVolume:      qq.avgVol3m,
        volRatio,
        endDateLabel:   endBar.dateLabel,
        startDateLabel: startBar.dateLabel,
        todayBuyVol,
        prevBuyVol,
        buyVolRatio,
        todayBuyFrac,
        prevBuyFrac,
        todayOpen:  endBar.open,   todayHigh:  endBar.high,
        todayLow:   endBar.low,    todayClose: endBar.close,
        prevOpen:   startBar.open, prevHigh:   startBar.high,
        prevLow:    startBar.low,  prevClose:  startBar.close,
        prevVolume: startBar.volume,
        signal,
        score,
      });
    }

    if (i + CANDLE_CONC < candidates.length) await new Promise(r => setTimeout(r, 120));
  }

  const ORDER: Record<DayBuySignal, number> = { 'strong-buy': 0, 'buy-surge': 1, 'buy-reversal': 2 };
  results.sort((a, b) => {
    const os = ORDER[a.signal] - ORDER[b.signal];
    return os !== 0 ? os : b.buyVolRatio - a.buyVolRatio;
  });

  return results.slice(0, maxResults);
}
