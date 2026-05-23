/**
 * Volume Analysis Scanner
 *
 * Five institutional price-volume signals:
 *  1. Volume Surge    — today's volume vs 20-day avg (accumulation/distribution pressure)
 *  2. OBV Trend       — On-Balance Volume slope over 14 days (smart-money direction)
 *  3. VWAP Proxy      — 20-day volume-weighted avg price; is close above it?
 *  4. Short Interest  — % float short vs prior month (contrarian confirmation)
 *  5. 52-Week Prox.   — distance below 52-week high (breakout potential)
 */

import { ensureYFSession, yfHeaders, withCrumb, yfSym as _yfSymImport } from './yfClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VolumeSignalLabel =
  | 'surge-up'         // volume spike + price up  → accumulation
  | 'surge-down'       // volume spike + price down → distribution
  | 'elevated'
  | 'normal'
  | 'low';

export type OBVTrend = 'strong-rising' | 'rising' | 'flat' | 'falling' | 'strong-falling';

export type VolumePressure =
  | 'strong-accumulation'
  | 'accumulation'
  | 'neutral'
  | 'distribution'
  | 'strong-distribution';

export type VolumeScanResult = {
  symbol:       string;
  name:         string;
  sector:       string;

  // Price snapshot
  price:        number;
  changePct:    number;
  marketCapM:   number;

  // Signal 1 — Volume
  volumeToday:  number;
  avgVolume20d: number;
  volumeRatio:  number;        // today / 20d avg
  volumeSignal: VolumeSignalLabel;

  // Signal 2 — OBV
  obvTrend:     OBVTrend;
  obvSlope:     number;        // normalised slope (positive = buying pressure)

  // Signal 3 — VWAP Proxy (20d volume-weighted avg typical price)
  vwapProxy:    number;
  aboveVwap:    boolean;
  vwapPct:      number;        // % close is above (+) or below (-) VWAP proxy

  // Signal 4 — Short Interest
  shortPct:     number | null; // % of float short
  shortPriorPct:number | null; // prior month %
  shortTrend:   'increasing' | 'decreasing' | 'stable' | 'unknown';

  // Signal 5 — 52-week proximity
  week52High:   number;
  week52Low:    number;
  highProxPct:  number;        // % below 52-week high (0 = AT high, negative = above)
  nearBreakout: boolean;       // within 5% of 52-week high

  // Composite
  score:        number;        // -7 … +9
  pressure:     VolumePressure;
  signalBreakdown: string[];   // human-readable reasons
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const yfSymbol = _yfSymImport;

/** Linear regression slope of an array of numbers (y), normalised by mean |y|. */
function normSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - xMean;
    num += dx * (values[i] - yMean);
    den += dx * dx;
  }
  const slope = den === 0 ? 0 : num / den;
  const scale = Math.abs(yMean) || 1;
  return slope / scale;
}

// ── Step 1: Batch quote snapshot ──────────────────────────────────────────────

type BatchQuote = {
  symbol:     string;
  name:       string;
  price:      number;
  changePct:  number;
  volume:     number;
  avgVol10d:  number;
  avgVol3m:   number;
  week52High: number;
  week52Low:  number;
  marketCapM: number;
};

/**
 * Fetch quote snapshot for up to 50 symbols in a single Yahoo Finance request.
 * Returns only stocks that pass basic filters (price > $1, mktcap > $500M).
 */
async function batchQuotes(symbols: string[]): Promise<BatchQuote[]> {
  const chunk = symbols.map(yfSymbol).join(',');
  const fields = [
    'symbol', 'shortName', 'regularMarketPrice', 'regularMarketChangePercent',
    'regularMarketVolume', 'averageDailyVolume10Day', 'averageDailyVolume3Month',
    'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', 'marketCap',
  ].join(',');

  for (const host of ['query2', 'query1']) {
    const baseUrl = `https://${host}.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(chunk)}&fields=${fields}&lang=en-US&region=US`;
    try {
      const r = await fetch(withCrumb(baseUrl), { headers: yfHeaders(), cache: 'no-store' });
      if (!r.ok) continue;
      const json = await r.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = json?.quoteResponse?.result ?? [];
      const mapped = results
        .map((q) => ({
          symbol:     q.symbol as string,
          name:       (q.shortName ?? q.displayName ?? q.symbol) as string,
          price:      (q.regularMarketPrice ?? 0) as number,
          changePct:  (q.regularMarketChangePercent ?? 0) as number,
          volume:     (q.regularMarketVolume ?? 0) as number,
          avgVol10d:  (q.averageDailyVolume10Day ?? 0) as number,
          avgVol3m:   (q.averageDailyVolume3Month ?? 0) as number,
          week52High: (q.fiftyTwoWeekHigh ?? 0) as number,
          week52Low:  (q.fiftyTwoWeekLow ?? 0) as number,
          marketCapM: ((q.marketCap ?? 0) as number) / 1_000_000,
        }))
        .filter(q => q.price >= 10 && q.avgVol3m >= 500_000);
      if (mapped.length > 0) return mapped;
    } catch { /* try next host */ }
  }
  return [];
}

// ── Step 2: Candle-based signals (OBV + VWAP proxy) ──────────────────────────

type CandleSignals = {
  avgVolume20d: number;
  volumeRatio:  number;
  vwapProxy:    number;
  aboveVwap:    boolean;
  vwapPct:      number;
  obvTrend:     OBVTrend;
  obvSlope:     number;
};

async function fetchCandleSignals(symbol: string): Promise<CandleSignals | null> {
  const baseUrl =
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol(symbol))}` +
    `?interval=1d&range=3mo`;
  try {
    const r = await fetch(withCrumb(baseUrl), { headers: yfHeaders(), cache: 'no-store' });
    if (!r.ok) return null;
    const json = await r.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[]  = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const highs:   (number | null)[] = q.high   ?? [];
    const lows:    (number | null)[] = q.low    ?? [];
    const closes:  (number | null)[] = q.close  ?? [];
    const volumes: (number | null)[] = q.volume ?? [];

    // Build clean candles (require all 4 OHLCV fields)
    type Bar = { h: number; l: number; c: number; v: number };
    const bars: Bar[] = timestamps
      .map((_, i) => ({
        h: highs[i]   as number,
        l: lows[i]    as number,
        c: closes[i]  as number,
        v: volumes[i] as number,
      }))
      .filter(b => b.h != null && b.l != null && b.c != null && b.v != null && b.v > 0);

    if (bars.length < 21) return null;

    // ── Signal 1: 20-day avg volume & today's volume ratio ───────────────
    const last21 = bars.slice(-21);
    const hist20 = last21.slice(0, 20);
    const today  = last21[20];
    const avgVolume20d = hist20.reduce((s, b) => s + b.v, 0) / 20;
    const volumeRatio  = avgVolume20d > 0 ? today.v / avgVolume20d : 0;

    // ── Signal 3: 20-day VWAP proxy ─────────────────────────────────────
    // VWAP_proxy = Σ(TP × Vol) / Σ(Vol) for last 20 bars
    // TP = (H + L + C) / 3
    const vwapBars  = bars.slice(-20);
    const sumTPV    = vwapBars.reduce((s, b) => s + ((b.h + b.l + b.c) / 3) * b.v, 0);
    const sumVol    = vwapBars.reduce((s, b) => s + b.v, 0);
    const vwapProxy = sumVol > 0 ? sumTPV / sumVol : today.c;
    const aboveVwap = today.c >= vwapProxy;
    const vwapPct   = vwapProxy > 0 ? ((today.c - vwapProxy) / vwapProxy) * 100 : 0;

    // ── Signal 2: OBV + OBV trend ─────────────────────────────────────────
    // OBV computed over all available bars (direction, not absolute value)
    let obv = 0;
    const obvSeries: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const prev = bars[i - 1];
      const cur  = bars[i];
      if (cur.c > prev.c)      obv += cur.v;
      else if (cur.c < prev.c) obv -= cur.v;
      obvSeries.push(obv);
    }
    // Use last 14 OBV values for slope
    const obv14   = obvSeries.slice(-14);
    const slope   = normSlope(obv14);

    let obvTrend: OBVTrend;
    if      (slope >  0.05) obvTrend = 'strong-rising';
    else if (slope >  0.01) obvTrend = 'rising';
    else if (slope < -0.05) obvTrend = 'strong-falling';
    else if (slope < -0.01) obvTrend = 'falling';
    else                    obvTrend = 'flat';

    return { avgVolume20d, volumeRatio, vwapProxy, aboveVwap, vwapPct, obvTrend, obvSlope: slope };
  } catch {
    return null;
  }
}

// ── Step 3: Short interest (Yahoo Finance quoteSummary) ───────────────────────

type ShortData = {
  shortPct:      number | null;
  shortPriorPct: number | null;
  sharesFloat:   number | null;
};

async function fetchShortInterest(symbol: string): Promise<ShortData> {
  const baseUrl =
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yfSymbol(symbol))}` +
    `?modules=defaultKeyStatistics`;
  try {
    const r = await fetch(withCrumb(baseUrl), { headers: yfHeaders(), cache: 'no-store' });
    if (!r.ok) return { shortPct: null, shortPriorPct: null, sharesFloat: null };
    const json = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ks: any = json?.quoteSummary?.result?.[0]?.defaultKeyStatistics ?? {};

    function raw(key: string): number | null {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v: any = ks[key];
      if (v == null) return null;
      if (typeof v === 'object' && 'raw' in v) return typeof v.raw === 'number' ? v.raw : null;
      return typeof v === 'number' ? v : null;
    }

    const sharesShort      = raw('sharesShort');
    const sharesShortPrior = raw('sharesShortPriorMonth');
    const sharesFloat      = raw('floatShares');

    const shortPct = sharesShort != null && sharesFloat != null && sharesFloat > 0
      ? (sharesShort / sharesFloat) * 100
      : raw('shortPercentOfFloat') != null
        ? (raw('shortPercentOfFloat')! * 100)
        : null;

    const shortPriorPct = sharesShortPrior != null && sharesFloat != null && sharesFloat > 0
      ? (sharesShortPrior / sharesFloat) * 100
      : null;

    return { shortPct, shortPriorPct, sharesFloat };
  } catch {
    return { shortPct: null, shortPriorPct: null, sharesFloat: null };
  }
}

// ── Scoring engine ────────────────────────────────────────────────────────────

function score(
  volumeRatio: number,
  changePct: number,
  obvTrend: OBVTrend,
  aboveVwap: boolean,
  shortTrend: 'increasing' | 'decreasing' | 'stable' | 'unknown',
  highProxPct: number,
): { score: number; breakdown: string[] } {
  let s = 0;
  const bd: string[] = [];

  // Signal 1: Volume surge direction
  if (volumeRatio >= 2.0 && changePct > 0) {
    s += 3; bd.push('Strong volume surge on up day (+3)');
  } else if (volumeRatio >= 1.5 && changePct > 0) {
    s += 2; bd.push('Volume surge on up day (+2)');
  } else if (volumeRatio >= 1.5 && changePct < 0) {
    s -= 2; bd.push('Volume surge on down day (-2)');
  } else if (volumeRatio >= 2.0 && changePct < 0) {
    s -= 3; bd.push('Heavy volume dump (-3)');
  } else if (volumeRatio >= 1.2 && changePct > 0) {
    s += 1; bd.push('Elevated volume, price up (+1)');
  } else if (volumeRatio >= 1.2 && changePct < 0) {
    s -= 1; bd.push('Elevated volume, price down (-1)');
  }

  // Signal 2: OBV trend
  if      (obvTrend === 'strong-rising')  { s += 2; bd.push('OBV strongly rising — buying pressure (+2)'); }
  else if (obvTrend === 'rising')          { s += 1; bd.push('OBV rising — accumulation (+1)'); }
  else if (obvTrend === 'strong-falling')  { s -= 2; bd.push('OBV strongly falling — selling pressure (-2)'); }
  else if (obvTrend === 'falling')         { s -= 1; bd.push('OBV falling — distribution (-1)'); }

  // Signal 3: VWAP proxy
  if (aboveVwap) { s += 1; bd.push('Price above 20d VWAP (+1)'); }
  else           { s -= 1; bd.push('Price below 20d VWAP (-1)'); }

  // Signal 4: Short interest change
  if      (shortTrend === 'decreasing') { s += 1; bd.push('Short interest declining — short squeeze potential (+1)'); }
  else if (shortTrend === 'increasing') { s -= 1; bd.push('Short interest rising — bearish positioning (-1)'); }

  // Signal 5: 52-week high proximity
  if      (highProxPct <= 3)  { s += 2; bd.push('Within 3% of 52-week high — breakout zone (+2)'); }
  else if (highProxPct <= 8)  { s += 1; bd.push('Within 8% of 52-week high (+1)'); }

  return { score: s, breakdown: bd };
}

function toPressure(s: number): VolumePressure {
  if (s >= 6)  return 'strong-accumulation';
  if (s >= 3)  return 'accumulation';
  if (s <= -5) return 'strong-distribution';
  if (s <= -2) return 'distribution';
  return 'neutral';
}

function toVolumeSignal(ratio: number, changePct: number): VolumeSignalLabel {
  if (ratio >= 1.5 && changePct >= 0) return 'surge-up';
  if (ratio >= 1.5 && changePct < 0)  return 'surge-down';
  if (ratio >= 1.2)                   return 'elevated';
  if (ratio < 0.7)                    return 'low';
  return 'normal';
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export async function runVolumeScanner(
  universe: string[],
  maxResults = 40,
  sector?: string,          // optional sector filter
): Promise<VolumeScanResult[]> {

  // ── Phase 0: Initialise YF session (crumb + cookie) ─────────────────────
  await ensureYFSession();

  // ── Phase 1: Batch quote fetch (50 per request) ──────────────────────────
  const BATCH = 50;
  const allQuotes: BatchQuote[] = [];

  for (let i = 0; i < universe.length; i += BATCH) {
    const chunk = universe.slice(i, i + BATCH);
    const quotes = await batchQuotes(chunk);
    allQuotes.push(...quotes);
    if (i + BATCH < universe.length) await new Promise(r => setTimeout(r, 200));
  }

  // Sort by volume activity first, take top 100 candidates for candle analysis
  allQuotes.sort((a, b) => {
    const rA = a.avgVol3m > 0 ? a.volume / a.avgVol3m : 0;
    const rB = b.avgVol3m > 0 ? b.volume / b.avgVol3m : 0;
    return rB - rA;
  });
  const candidates = allQuotes.slice(0, 100);

  // ── Phase 2: Candle signals (parallel with concurrency limit) ────────────
  const CONCURRENCY = 6;
  const candleMap   = new Map<string, CandleSignals>();

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(q => fetchCandleSignals(q.symbol))
    );
    for (let j = 0; j < batch.length; j++) {
      if (results[j]) candleMap.set(batch[j].symbol, results[j]!);
    }
    if (i + CONCURRENCY < candidates.length) await new Promise(r => setTimeout(r, 150));
  }

  // Build intermediate results with score (no short interest yet)
  type Intermediate = BatchQuote & CandleSignals & {
    score: number;
    breakdown: string[];
    highProxPct: number;
    nearBreakout: boolean;
    shortTrend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
  };

  const interim: Intermediate[] = [];

  for (const q of candidates) {
    const cs = candleMap.get(q.symbol);
    if (!cs) continue;

    const highProxPct  = q.week52High > 0
      ? ((q.week52High - q.price) / q.week52High) * 100
      : 100;
    const nearBreakout = highProxPct <= 5;

    // Short trend = unknown until we fetch it
    const { score: s, breakdown } = score(
      cs.volumeRatio, q.changePct, cs.obvTrend, cs.aboveVwap, 'unknown', highProxPct,
    );
    interim.push({ ...q, ...cs, score: s, breakdown, highProxPct, nearBreakout, shortTrend: 'unknown' });
  }

  // Sort by score desc, take top 30 for short-interest enrichment
  interim.sort((a, b) => b.score - a.score);
  const top30 = interim.slice(0, 30);
  const rest  = interim.slice(30);

  // ── Phase 3: Short interest for top 30 (parallel, limited) ───────────────
  const SI_CONCURRENCY = 4;
  const shortMap = new Map<string, ShortData>();

  for (let i = 0; i < top30.length; i += SI_CONCURRENCY) {
    const batch = top30.slice(i, i + SI_CONCURRENCY);
    const results = await Promise.all(batch.map(q => fetchShortInterest(q.symbol)));
    for (let j = 0; j < batch.length; j++) {
      shortMap.set(batch[j].symbol, results[j]);
    }
    if (i + SI_CONCURRENCY < top30.length) await new Promise(r => setTimeout(r, 120));
  }

  // ── Assemble final results ────────────────────────────────────────────────
  function assemble(mid: Intermediate): VolumeScanResult {
    const si = shortMap.get(mid.symbol);
    let shortTrend: VolumeScanResult['shortTrend'] = 'unknown';
    if (si?.shortPct != null && si.shortPriorPct != null) {
      const diff = si.shortPct - si.shortPriorPct;
      if      (diff >  0.5) shortTrend = 'increasing';
      else if (diff < -0.5) shortTrend = 'decreasing';
      else                  shortTrend = 'stable';
    }

    // Re-score with short interest
    const { score: s, breakdown } = score(
      mid.volumeRatio, mid.changePct, mid.obvTrend,
      mid.aboveVwap, shortTrend, mid.highProxPct,
    );

    return {
      symbol:       mid.symbol,
      name:         mid.name,
      sector:       '',          // filled by TradingView batch if needed
      price:        mid.price,
      changePct:    mid.changePct,
      marketCapM:   mid.marketCapM,
      volumeToday:  mid.volume,
      avgVolume20d: mid.avgVolume20d,
      volumeRatio:  mid.volumeRatio,
      volumeSignal: toVolumeSignal(mid.volumeRatio, mid.changePct),
      obvTrend:     mid.obvTrend,
      obvSlope:     mid.obvSlope,
      vwapProxy:    mid.vwapProxy,
      aboveVwap:    mid.aboveVwap,
      vwapPct:      mid.vwapPct,
      shortPct:     si?.shortPct ?? null,
      shortPriorPct:si?.shortPriorPct ?? null,
      shortTrend,
      week52High:   mid.week52High,
      week52Low:    mid.week52Low,
      highProxPct:  mid.highProxPct,
      nearBreakout: mid.nearBreakout,
      score:        s,
      pressure:     toPressure(s),
      signalBreakdown: breakdown,
    };
  }

  const finalTop  = top30.map(assemble);
  const finalRest = rest.map(mid => {
    const { score: s, breakdown } = score(
      mid.volumeRatio, mid.changePct, mid.obvTrend,
      mid.aboveVwap, 'unknown', mid.highProxPct,
    );
    return assemble({ ...mid, score: s, breakdown });
  });

  const all = [...finalTop, ...finalRest];

  // Apply optional sector filter
  const filtered = sector
    ? all.filter(r => r.sector.toLowerCase().includes(sector.toLowerCase()))
    : all;

  // Final sort: strong-accumulation first, then accumulation, then by score
  const pressureOrder: Record<VolumePressure, number> = {
    'strong-accumulation': 0,
    'accumulation':        1,
    'neutral':             2,
    'distribution':        3,
    'strong-distribution': 4,
  };

  filtered.sort((a, b) => {
    const po = pressureOrder[a.pressure] - pressureOrder[b.pressure];
    return po !== 0 ? po : b.score - a.score;
  });

  return filtered.slice(0, maxResults);
}
