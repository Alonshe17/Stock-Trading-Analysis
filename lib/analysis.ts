import type { Candle } from './finnhub';
import { detectPattern } from './patterns';

export type Signal = 'BREAKOUT' | 'PULLBACK' | 'MEAN_REVERT' | 'WATCH' | 'AVOID' | 'NEUTRAL';

export type AnalysisResult = {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  change: number;        // % change from prev close
  rsi: number;
  ema8: number;
  ema50: number;
  ema150: number;
  ema200: number;
  atr: number;
  atrPct: number;
  macdLine: number;
  signalLine: number;
  macdHistogram: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  week52High: number;
  week52Low: number;
  distanceFromHigh: number; // % below 52-week high
  minerviniScore: number;   // 0-6
  peRatio: number;
  marketCap: number;        // millions USD
  dividend: number;         // annual dividend per share
  signal: Signal;
  pattern: string | null;
  entryZone: [number, number] | null;
  stopLoss: number | null;
  target: number | null;
  rrRatio: number | null;
};

// --- Pure TA calculations ---

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(prev);
    } else {
      prev = values[i] * k + prev * (1 - k);
      result.push(prev);
    }
  }
  return result;
}

function sma(values: number[], period: number): number[] {
  return values.map((_, i) =>
    i < period - 1
      ? NaN
      : values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period,
  );
}

function calcRsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcAtr(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0;
  const trs = candles.slice(1).map((c, i) => {
    const prev = candles[i].c;
    return Math.max(c.h - c.l, Math.abs(c.h - prev), Math.abs(c.l - prev));
  });
  if (trs.length < period) return trs[trs.length - 1] ?? 0;
  // Wilder smoothing
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

function calcMacd(closes: number[]): { macd: number; signal: number; histogram: number } {
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  const macdLine = fast.map((f, i) => (isNaN(f) || isNaN(slow[i]) ? NaN : f - slow[i]));
  const validMacd = macdLine.filter((v) => !isNaN(v));
  if (validMacd.length < 9) return { macd: 0, signal: 0, histogram: 0 };
  const signalArr = ema(validMacd, 9);
  const macd = validMacd[validMacd.length - 1];
  const signal = signalArr[signalArr.length - 1];
  return { macd, signal, histogram: macd - signal };
}

function calcBollinger(
  closes: number[],
  period = 20,
  mult = 2,
): { upper: number; middle: number; lower: number } {
  if (closes.length < period) return { upper: 0, middle: 0, lower: 0 };
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
  const stddev = Math.sqrt(variance);
  return { upper: middle + mult * stddev, middle, lower: middle - mult * stddev };
}

// Minervini Trend Template score 0-6
function minerviniScore(
  price: number,
  e50: number,
  e150: number,
  e200: number,
  e200_20dAgo: number,
  week52High: number,
): number {
  let score = 0;
  if (price > e50) score++;
  if (price > e150) score++;
  if (price > e200) score++;
  if (e50 > e150 && e150 > e200) score++;
  if (e200 > e200_20dAgo) score++;
  if (price >= week52High * 0.75) score++; // within 25% of 52-week high
  return score;
}

function determineSignal(
  price: number,
  rsi: number,
  e50: number,
  e150: number,
  e200: number,
  week52High: number,
  distanceFromHigh: number,
  mScore: number,
  pattern: string | null,
  marketRegime: 'BULLISH' | 'CAUTION' | 'BEARISH',
): Signal {
  const inUptrend = price > e50 && e50 > e150 && e150 > e200;
  const nearHigh = distanceFromHigh <= 5;
  const oversold = rsi < 35;
  const deepPullback = distanceFromHigh >= 15 && distanceFromHigh <= 35;
  const bullishPattern = pattern?.startsWith('Bull') || pattern === 'Pin Bar' || pattern === 'Inside Bar';

  // AVOID: below 200 EMA, trend broken
  if (price < e200 && e50 < e200) return 'AVOID';

  // BREAKOUT: near 52-week high, full trend alignment, momentum
  if (nearHigh && mScore >= 5 && rsi >= 50 && rsi <= 75 && marketRegime === 'BULLISH') {
    return 'BREAKOUT';
  }

  // PULLBACK: in uptrend, pulled back to support (pattern is a bonus, not required)
  if (inUptrend && rsi >= 35 && rsi <= 58 && marketRegime !== 'BEARISH') {
    return 'PULLBACK';
  }

  // MEAN_REVERT: deep pullback from high, oversold
  if (deepPullback && oversold && price > e200 * 0.95) {
    return 'MEAN_REVERT';
  }

  // WATCH: partial criteria met
  if (mScore >= 3 || (inUptrend && rsi < 50)) return 'WATCH';

  return 'NEUTRAL';
}

function calcEntryStopTarget(
  signal: Signal,
  price: number,
  atr: number,
  e50: number,
  e200: number,
  week52High: number,
): { entry: [number, number]; stop: number; target: number; rr: number } | null {
  if (signal === 'AVOID' || signal === 'NEUTRAL' || signal === 'WATCH') return null;

  let entryLow: number, entryHigh: number, stop: number, target: number;

  if (signal === 'BREAKOUT') {
    entryLow = price;
    entryHigh = price * 1.01;
    stop = price - atr * 1.5;
    target = week52High * 1.08; // 8% above 52-week high
  } else if (signal === 'PULLBACK') {
    entryLow = Math.max(e50 * 0.99, price * 0.99);
    entryHigh = price;
    stop = e50 - atr * 1.2;
    target = price + atr * 3;
  } else {
    // MEAN_REVERT
    entryLow = price;
    entryHigh = price * 1.02;
    stop = e200 - atr;
    target = price + atr * 4;
  }

  const midEntry = (entryLow + entryHigh) / 2;
  const risk = midEntry - stop;
  const reward = target - midEntry;
  const rr = risk > 0 ? reward / risk : 0;

  return { entry: [entryLow, entryHigh], stop, target, rr };
}

export function analyze(symbol: string, candles: Candle[], marketRegime: 'BULLISH' | 'CAUTION' | 'BEARISH' = 'BULLISH'): AnalysisResult {
  if (candles.length < 30) {
    return emptyResult(symbol);
  }

  const closes = candles.map((c) => c.c);
  const lastCandle = candles[candles.length - 1];
  const price = closes[closes.length - 1];
  const prevClose = closes[closes.length - 2];
  const change = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

  const ema8Arr = ema(closes, 8);
  const ema50Arr = ema(closes, 50);
  const ema150Arr = ema(closes, 150);
  const ema200Arr = ema(closes, 200);
  const e8 = ema8Arr[ema8Arr.length - 1] ?? price;
  const e50 = ema50Arr[ema50Arr.length - 1] ?? price;
  const e150 = ema150Arr[ema150Arr.length - 1] ?? price;
  const e200 = ema200Arr[ema200Arr.length - 1] ?? price;
  const e200_20dAgo = ema200Arr[ema200Arr.length - 21] ?? e200;

  const rsi = calcRsi(closes);
  const atr = calcAtr(candles);
  const atrPct = price > 0 ? (atr / price) * 100 : 0;
  const { macd: macdLine, signal: signalLine, histogram: macdHistogram } = calcMacd(closes);
  const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = calcBollinger(closes);

  const week252 = candles.slice(-252);
  const highs = week252.map((c) => c.h);
  const lows = week252.map((c) => c.l);
  const week52High = highs.length > 0 ? highs.reduce((a, b) => (b > a ? b : a)) : price;
  const week52Low = lows.length > 0 ? lows.reduce((a, b) => (b < a ? b : a)) : price;
  const distanceFromHigh = week52High > 0 ? ((week52High - price) / week52High) * 100 : 0;

  const mScore = minerviniScore(price, e50, e150, e200, e200_20dAgo, week52High);
  const pattern = detectPattern(candles.slice(-5));
  const signal = determineSignal(price, rsi, e50, e150, e200, week52High, distanceFromHigh, mScore, pattern, marketRegime);

  const trade = calcEntryStopTarget(signal, price, atr, e50, e200, week52High);

  return {
    symbol,
    price,
    open: lastCandle.o,
    high: lastCandle.h,
    low: lastCandle.l,
    change,
    rsi,
    ema8: e8,
    ema50: e50,
    ema150: e150,
    ema200: e200,
    atr,
    atrPct,
    macdLine,
    signalLine,
    macdHistogram,
    bbUpper,
    bbMiddle,
    bbLower,
    week52High,
    week52Low,
    distanceFromHigh,
    minerviniScore: mScore,
    peRatio: 0,    // filled in by API route via getQuoteFundamentals
    marketCap: 0,  // filled in by API route via getQuoteFundamentals
    dividend: 0,   // filled in by API route via getQuoteFundamentals
    signal,
    pattern,
    entryZone: trade?.entry ?? null,
    stopLoss: trade?.stop ?? null,
    target: trade?.target ?? null,
    rrRatio: trade?.rr ?? null,
  };
}

export function calcAverageVolume(candles: Candle[], days = 20): number {
  const slice = candles.slice(-days);
  if (slice.length === 0) return 0;
  return slice.reduce((a, c) => a + c.v, 0) / slice.length;
}

function emptyResult(symbol: string): AnalysisResult {
  return {
    symbol, price: 0, open: 0, high: 0, low: 0, change: 0, rsi: 50,
    ema8: 0, ema50: 0, ema150: 0, ema200: 0,
    atr: 0, atrPct: 0, macdLine: 0, signalLine: 0, macdHistogram: 0,
    bbUpper: 0, bbMiddle: 0, bbLower: 0, week52High: 0, week52Low: 0,
    distanceFromHigh: 0, minerviniScore: 0, peRatio: 0, marketCap: 0, dividend: 0,
    signal: 'NEUTRAL', pattern: null,
    entryZone: null, stopLoss: null, target: null, rrRatio: null,
  };
}

export function calcMarketRegime(spyCandles: Candle[]): 'BULLISH' | 'CAUTION' | 'BEARISH' {
  if (spyCandles.length < 200) return 'CAUTION';
  const closes = spyCandles.map((c) => c.c);
  const price = closes[closes.length - 1];
  const ema50Arr = ema(closes, 50);
  const ema200Arr = ema(closes, 200);
  const e50 = ema50Arr[ema50Arr.length - 1];
  const e200 = ema200Arr[ema200Arr.length - 1];
  if (price > e50 && price > e200 && e50 > e200) return 'BULLISH';
  if (price < e200) return 'BEARISH';
  return 'CAUTION';
}
