import type { Candle } from './finnhub';
import { fetchTVDataBatch } from './tradingview';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

export type QuoteSnapshot = {
  symbol: string;
  name?: string;        // company name (optional)
  price: number;
  prevClose: number;
  changePct: number;
  volume: number;       // current day's volume so far
  avgVolume: number;    // 20-day average daily volume
  volPace: number;      // volume pace vs average (adjusted for time of day)
  marketCap: number;    // in millions USD
  high: number;
  low: number;
};

export type EmaStatus =
  | 'ABOVE_BOTH'    // price > EMA8 > EMA200 — strong uptrend
  | 'BETWEEN'       // EMA200 < price < EMA8 — pullback in uptrend (buy zone)
  | 'EMA8_CROSS_UP' // EMA8 just crossed above EMA200 (last 3 bars) — fresh signal
  | 'BELOW_EMA8'    // price < EMA8 but above EMA200
  | 'BELOW_BOTH'    // price < EMA8 < EMA200 — downtrend
  | 'NO_DATA';

export type ScanResult = QuoteSnapshot & {
  ema8: number;
  ema200: number;
  emaStatus: EmaStatus;
  candles: Candle[];
  tvRating: string | null;  // TradingView technical recommendation
};

// --- EMA helper ---
function calcEma(values: number[], period: number): number[] {
  if (values.length < period) return values.map(() => NaN);
  const k = 2 / (period + 1);
  const result: number[] = new Array(values.length).fill(NaN);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result[i] = prev;
  }
  return result;
}

// Step 1: Fast batch quote check — price, volume, market cap filter
async function fetchQuote(symbol: string): Promise<QuoteSnapshot | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=25d`;
    const res = await fetch(url, { headers: YF_HEADERS, cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price: number = meta.regularMarketPrice ?? 0;
    const prevClose: number = meta.previousClose ?? meta.chartPreviousClose ?? 0;
    const volume: number = meta.regularMarketVolume ?? 0;
    const marketCap: number = (meta.marketCap ?? 0) / 1_000_000; // convert to millions

    // Calculate 20-day average volume from historical data
    const quotes = result.indicators?.quote?.[0];
    const volumes: number[] = (quotes?.volume ?? []).filter((v: number) => v != null && v > 0);
    const avgVolume = volumes.length > 1
      ? volumes.slice(0, -1).reduce((a: number, b: number) => a + b, 0) / (volumes.length - 1)
      : 0;

    // Volume pace: at 11 AM EST (~2.5h into 6.5h session = ~38% of day elapsed)
    // We expect ~38% of daily volume by 11 AM for an average stock
    const pctDayElapsed = 0.38;
    const volPace = avgVolume > 0 ? volume / (avgVolume * pctDayElapsed) : 0;

    const changePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

    return {
      symbol,
      price,
      prevClose,
      changePct,
      volume,
      avgVolume,
      volPace,
      marketCap,
      high: meta.regularMarketDayHigh ?? price,
      low: meta.regularMarketDayLow ?? price,
    };
  } catch {
    return null;
  }
}

// Step 2: Fetch daily candles and compute EMA8 + EMA200
async function fetchCandles(symbol: string): Promise<Candle[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2y`;
    const res = await fetch(url, { headers: YF_HEADERS, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    return timestamps
      .map((t: number, i: number) => ({
        t,
        o: q.open?.[i],
        h: q.high?.[i],
        l: q.low?.[i],
        c: q.close?.[i],
        v: q.volume?.[i] ?? 0,
      }))
      .filter((c) => c.o != null && c.c != null);
  } catch {
    return [];
  }
}

function getEmaStatus(price: number, ema8: number, ema200: number, ema8Arr: number[]): EmaStatus {
  if (!ema8 || !ema200 || isNaN(ema8) || isNaN(ema200)) return 'NO_DATA';

  // Check if EMA8 just crossed above EMA200 in the last 3 bars
  const len = ema8Arr.length;
  const recentEma8 = ema8Arr.slice(-4);
  const crossedUp = recentEma8.some((v, i) => i > 0 && recentEma8[i - 1] < ema200 && v >= ema200);

  if (crossedUp) return 'EMA8_CROSS_UP';
  if (price > ema8 && ema8 > ema200) return 'ABOVE_BOTH';
  if (price > ema200 && price < ema8) return 'BETWEEN';
  if (price < ema8 && ema8 > ema200) return 'BELOW_EMA8';
  return 'BELOW_BOTH';
}

// Main scanner — runs the two-step filter
export async function runIntradayScanner(
  universe: string[],
  minPrice = 1,
  minMarketCapM = 1_000,  // $1B in millions
  minVolume = 500_000,
  maxResults = 40,
): Promise<ScanResult[]> {
  const passed: QuoteSnapshot[] = [];

  // Step 1: Quick quote filter — staggered to avoid rate limits
  for (let i = 0; i < universe.length; i++) {
    await new Promise((r) => setTimeout(r, 120));
    const quote = await fetchQuote(universe[i]);
    if (!quote) continue;
    if (quote.price < minPrice) continue;
    if (quote.marketCap > 0 && quote.marketCap < minMarketCapM) continue;
    if (quote.volume < minVolume) continue;
    passed.push(quote);
  }

  // Sort by volume pace desc (highest momentum first), take top 60 for EMA analysis
  passed.sort((a, b) => b.volPace - a.volPace);
  const candidates = passed.slice(0, 60);

  // Fetch TradingView technical ratings for all candidates in one batch request
  const tvData = await fetchTVDataBatch(candidates.map((c) => c.symbol))
    .catch(() => new Map<string, import('./tradingview').TVData>());

  // Step 2: Fetch candles + compute EMAs for candidates
  const results: ScanResult[] = [];

  for (let i = 0; i < candidates.length; i++) {
    await new Promise((r) => setTimeout(r, 150));
    const q = candidates[i];
    const candles = await fetchCandles(q.symbol);
    if (candles.length < 9) continue;

    const closes = candles.map((c) => c.c);
    const ema8Arr = calcEma(closes, 8);
    const ema200Arr = calcEma(closes, 200);

    const ema8 = ema8Arr[ema8Arr.length - 1];
    const ema200 = ema200Arr[ema200Arr.length - 1];
    const emaStatus = getEmaStatus(q.price, ema8, ema200, ema8Arr);
    const tvRating = tvData.get(q.symbol.toUpperCase())?.tvRating ?? null;

    results.push({ ...q, ema8, ema200, emaStatus, candles, tvRating });
  }

  // Final sort: prioritise EMA8_CROSS_UP and ABOVE_BOTH, then by volPace
  const statusOrder: Record<EmaStatus, number> = {
    EMA8_CROSS_UP: 0,
    ABOVE_BOTH: 1,
    BETWEEN: 2,
    BELOW_EMA8: 3,
    BELOW_BOTH: 4,
    NO_DATA: 5,
  };

  results.sort((a, b) => {
    const so = statusOrder[a.emaStatus] - statusOrder[b.emaStatus];
    return so !== 0 ? so : b.volPace - a.volPace;
  });

  return results.slice(0, maxResults);
}
