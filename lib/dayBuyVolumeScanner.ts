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
 * Universe: fetches all ~6,000 US symbols from GitHub (same as weekly scanner),
 * falls back to the static US_STOCKS list if the fetch fails.
 *
 * Signals:
 *   strong-buy    → buyVolRatio ≥ 3× AND price change ≥ +2%
 *   buy-surge     → buyVolRatio ≥ 2× AND price change ≥ 0%
 *   buy-reversal  → buyVolRatio ≥ 2× AND price change < 0% (demand absorbing supply)
 *   vol-surge     → totalVolRatio ≥ 2× (big total volume day, direction unclear)
 *                   catches stocks where TradingView shows a big volume bar
 *                   even if the close-price-location estimate shows mixed buy/sell
 */

import { ensureYFSession, yfHeaders, withCrumb, yfSym } from './yfClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DayBuySignal = 'strong-buy' | 'buy-surge' | 'vol-surge';

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

  totalVolRatio:  number;      // endBar.volume / startBar.volume  ← broad volume jump

  todayBuyVol:    number;      // end-date estimated buying volume
  prevBuyVol:     number;      // start-date estimated buying volume
  buyVolRatio:    number;      // todayBuyVol / prevBuyVol

  todayBuyFrac:   number;      // end-date buying pressure (0–1)
  prevBuyFrac:    number;      // start-date buying pressure (0–1)

  // Bar OHLCV for the expanded view
  todayOpen:  number; todayHigh: number; todayLow: number; todayClose: number;
  prevOpen:   number; prevHigh:  number; prevLow:  number; prevClose:  number;
  prevVolume: number;

  signal: DayBuySignal;
  score:  number;
};

// ── Fetch full US symbol list (same pattern as weeklyVolumeScanner) ────────────

const CLEAN_TICKER = /^[A-Z]{1,5}$/;

async function fetchUSSymbols(): Promise<string[]> {
  try {
    const r = await fetch(
      'https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/all/all_tickers.txt',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' },
    );
    if (r.ok) {
      const text = await r.text();
      const syms = text.split('\n').map(s => s.trim().toUpperCase()).filter(s => CLEAN_TICKER.test(s));
      if (syms.length > 1000) return syms;
    }
  } catch { /* fall through */ }

  // Fallback: NASDAQ FTP
  const symbols = new Set<string>();
  for (const url of [
    'https://ftp.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt',
    'https://ftp.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt',
  ]) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
      if (!r.ok) continue;
      const text = await r.text();
      for (const line of text.split('\n').slice(1)) {
        const sym = line.split('|')[0]?.trim().toUpperCase();
        if (sym && CLEAN_TICKER.test(sym)) symbols.add(sym);
      }
    } catch { /* skip */ }
  }
  return symbols.size > 500 ? [...symbols] : [];
}

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

/**
 * Classify purely on volume — price direction is informational only.
 * The user wants to see volume surges early, before price has moved.
 *
 *   strong-buy  → estimated buying volume jumped ≥ 3× (most conviction)
 *   buy-surge   → estimated buying volume jumped ≥ 2×
 *   vol-surge   → total volume jumped ≥ 2× (buy/sell mix unclear —
 *                 matches what TradingView shows as a big volume bar)
 */
function classify(buyVolRatio: number, totalVolRatio: number): DayBuySignal {
  if (buyVolRatio >= 3) return 'strong-buy';
  if (buyVolRatio >= 2) return 'buy-surge';
  return 'vol-surge';   // totalVolRatio >= 2 (already filtered above)
}

function calcScore(signal: DayBuySignal, buyVolRatio: number, totalVolRatio: number): number {
  const base     = signal === 'strong-buy' ? 7 : signal === 'buy-surge' ? 5 : 3;
  const metric   = signal === 'vol-surge' ? totalVolRatio : buyVolRatio;
  const volBonus = Math.min(3, Math.floor(metric - 2));
  return Math.min(10, base + volBonus);
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export async function runDayBuyVolumeScanner(
  fallbackUniverse: string[],
  maxResults = 50,
  endDate?:   string,   // YYYY-MM-DD — the "after" bar
  startDate?: string,   // YYYY-MM-DD — the "before" bar
): Promise<DayBuyVolumeResult[]> {

  const customDates = !!(startDate && endDate);
  const rangeParam  = customDates ? rangeForDates(startDate!, endDate!) : '5d';

  // Phase 0: YF session
  await ensureYFSession();

  // Phase 1: get universe — try GitHub (~6,000 symbols), fall back to static list
  let universe = await fetchUSSymbols();
  if (universe.length < 500) universe = [...new Set(fallbackUniverse)];

  // Phase 2: batch-quote the full universe (batches of 100, concurrency 3)
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

  // Phase 3: build candidate list for OHLCV fetching — full universe, no slice cap.
  //
  // ALL symbols returned by v7/quote that pass price/vol filters are included.
  // On top of that, every fallbackUniverse (US_STOCKS) symbol not captured by
  // v7/quote is guaranteed to be checked (fixes stocks like IONQ that v7/quote
  // silently drops).  Placeholder quote data is used for those; actual
  // price/vol is validated against real bar data in Phase 4.

  const fromQuote: QuickQuote[] = customDates
    ? allQuotes.filter(q => q.avgVol3m > 0)                     // all qualifying — no cap
    : allQuotes                                                   // today vs prev day:
        .filter(q => q.avgVol3m > 0 && q.avgVol10d > 0)         //   pre-rank by recent activity
        .map(q => ({ ...q, recentRatio: q.avgVol10d / q.avgVol3m }))
        .sort((a, b) =>
          (b as typeof b & { recentRatio: number }).recentRatio -
          (a as typeof a & { recentRatio: number }).recentRatio
        );

  const coveredSet = new Set(fromQuote.map(q => q.symbol));

  // Guaranteed path: curated US_STOCKS symbols v7/quote may have missed
  const guaranteed: QuickQuote[] = fallbackUniverse
    .filter(sym => !coveredSet.has(sym))
    .map(sym => ({
      symbol:     sym,
      name:       sym,
      price:      50,        // placeholder
      changePct:  0,
      volume:     0,
      avgVol10d:  1_000_000,
      avgVol3m:   1_000_000,
      marketCapM: 0,
    }));

  const candidates: QuickQuote[] = [...fromQuote, ...guaranteed];

  // Phase 4: fetch OHLCV bars and compute buying volume for the two dates.
  // Higher concurrency (20) to handle the full ~3,000+ candidate set within
  // Vercel's 120 s function limit.
  const CANDLE_CONC = 20;
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
      const buyVolRatio   = todayBuyVol / prevBuyVol;
      const totalVolRatio = startBar.volume > 0 ? endBar.volume / startBar.volume : 0;

      // Price floor — guaranteed symbols bypass v7/quote so check actual bar price
      if (endBar.close < 10) continue;

      // Accept if either buying volume OR total volume jumped ≥ 2×.
      // This catches stocks like IONQ where total volume explodes even if the
      // close-price-location model shows mixed buy/sell activity.
      if (buyVolRatio < 2 && totalVolRatio < 2) continue;
      if (endBar.volume < 200_000) continue;

      const signal = classify(buyVolRatio, totalVolRatio);
      const score  = calcScore(signal, buyVolRatio, totalVolRatio);

      // For guaranteed symbols (placeholder avgVol3m = 1_000_000), estimate
      // avgVol3m from the bars we already fetched; otherwise use the quote value.
      const isGuaranteed = qq.avgVol3m === 1_000_000 && qq.marketCapM === 0;
      const avgVol3mEst  = isGuaranteed
        ? bars.reduce((s, b) => s + b.volume, 0) / Math.max(bars.length, 1)
        : qq.avgVol3m;
      const volRatio = avgVol3mEst > 0 ? endBar.volume / avgVol3mEst : 0;

      results.push({
        symbol:         qq.symbol,
        name:           qq.name,
        price:          endBar.close,
        changePct,
        volume:         endBar.volume,
        avgVolume:      avgVol3mEst,
        volRatio,
        endDateLabel:   endBar.dateLabel,
        startDateLabel: startBar.dateLabel,
        totalVolRatio,
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

    if (i + CANDLE_CONC < candidates.length) await new Promise(r => setTimeout(r, 80));
  }

  // Sort purely by volume jump magnitude — biggest spike first.
  // Price direction is irrelevant; we want early signals before the move.
  results.sort((a, b) => {
    const aMetric = Math.max(a.totalVolRatio, a.buyVolRatio);
    const bMetric = Math.max(b.totalVolRatio, b.buyVolRatio);
    return bMetric - aMetric;
  });

  return results.slice(0, maxResults);
}
