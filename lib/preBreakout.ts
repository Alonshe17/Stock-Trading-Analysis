/**
 * Pre-Breakout Detector
 *
 * Designed to find stocks BEFORE the big price jump — the quiet multi-week
 * accumulation phase that precedes institutional breakouts (Micron, Sandisk, etc.).
 *
 * Seven detection signals:
 *  1. Stage 2 Alignment    — Price > 50dMA > 150dMA > 200dMA (IBD trend template)
 *  2. Base Tightness       — 20-day price range < 15% (coiling = energy building)
 *  3. Up/Down Vol Ratio    — Vol on up-days vs down-days (smart-money fingerprint)
 *  4. Relative Strength    — Stock 60-day return vs SPY (institutions rotating in)
 *  5. Volume Dry-Up (VDU)  — Volume declining during base = no distribution selling
 *  6. Pocket Pivot         — Today's vol > max down-day vol last 10d (entry trigger)
 *  7. OBV Trend            — On-Balance Volume rising while price is flat (hidden buying)
 */

import { ensureYFSession, yfHeaders, withCrumb, yfSym as _yfSym } from './yfClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Stage =
  | 'stage2'        // Price > 50d > 150d > 200d — ideal
  | 'stage2-early'  // Price > 50d > 200d (150d not fully aligned yet)
  | 'stage1'        // Basing: price flat near 200dMA
  | 'stage3'        // Topping: price extended far above all MAs
  | 'stage4';       // Downtrend: below all MAs

export type SetupGrade = 'A' | 'B' | 'C' | 'D';

export type PreBreakoutResult = {
  symbol:       string;
  name:         string;
  sector:       string;

  // Price
  price:        number;
  changePct:    number;
  marketCapM:   number;
  avgVolume:    number;

  // Signal 1 — Stage
  stage:        Stage;
  ma50:         number;
  ma150:        number;
  ma200:        number;
  pctAbove50:   number;  // % above 50dMA
  pctAbove200:  number;  // % above 200dMA

  // Signal 2 — Base tightness (20-day consolidation)
  baseRangePct: number;  // (20d high - 20d low) / 20d low × 100
  baseHigh:     number;
  baseLow:      number;
  inBase:       boolean; // <15% range

  // Signal 3 — Up/Down volume ratio
  upDownVolRatio: number; // sum up-day vol / sum down-day vol (20 sessions)
  upVol:          number;
  downVol:        number;

  // Signal 4 — Relative strength vs SPY
  rs60d:        number;  // stock 60d return - SPY 60d return (% pts)
  stockRet60d:  number;
  spyRet60d:    number;
  rsGrading:    'outperforming' | 'in-line' | 'underperforming';

  // Signal 5 — Volume dry-up
  vdu:          boolean; // last 5d avg vol < 70% of 50d avg vol
  vduRatio:     number;  // last5dAvgVol / avg50dVol

  // Signal 6 — Pocket Pivot
  pocketPivot:  boolean; // today vol > max down-day vol in last 10 bars
  ppVolRatio:   number;  // today vol / max down-day vol

  // Signal 7 — OBV trend
  obvTrend:     'rising' | 'flat' | 'falling';
  obvSlope:     number;

  // 52-week metrics
  week52High:   number;
  week52Low:    number;
  fromHigh:     number;  // % below 52w high

  // Composite
  score:        number;      // 0–10
  grade:        SetupGrade;
  catalysts:    string[];    // human-readable reasons why this is flagged
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const yfSym = _yfSym;

function sma(arr: number[], period: number): number | null {
  if (arr.length < period) return null;
  return arr.slice(-period).reduce((a, b) => a + b, 0) / period;
}

/** Normalised linear-regression slope over last N values. */
function normSlope(arr: number[], n = 14): number {
  const vals = arr.slice(-n);
  const len = vals.length;
  if (len < 2) return 0;
  const xMean = (len - 1) / 2;
  const yMean = vals.reduce((a, b) => a + b, 0) / len;
  let num = 0, den = 0;
  for (let i = 0; i < len; i++) {
    const dx = i - xMean;
    num += dx * (vals[i] - yMean);
    den += dx * dx;
  }
  const slope = den === 0 ? 0 : num / den;
  return slope / (Math.abs(yMean) || 1);
}

// ── Fetch candles ─────────────────────────────────────────────────────────────

type Bar = { t: number; o: number; h: number; l: number; c: number; v: number };

async function fetchBars(symbol: string, range = '1y'): Promise<Bar[]> {
  // Try query2 first (less rate-limited), fall back to query1
  for (const host of ['query2', 'query1']) {
    const baseUrl =
      `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym(symbol))}` +
      `?interval=1d&range=${range}`;
    try {
      const r = await fetch(withCrumb(baseUrl), { headers: yfHeaders(), cache: 'no-store' });
      if (!r.ok) continue;
      const json = await r.json();
      const result = json?.chart?.result?.[0];
      if (!result) continue;
      const ts: number[] = result.timestamp ?? [];
      const q = result.indicators?.quote?.[0] ?? {};
      const bars = ts
        .map((t: number, i: number) => ({
          t,
          o: q.open?.[i]   as number,
          h: q.high?.[i]   as number,
          l: q.low?.[i]    as number,
          c: q.close?.[i]  as number,
          v: q.volume?.[i] as number ?? 0,
        }))
        .filter(b => b.o != null && b.c != null && b.h != null && b.l != null);
      if (bars.length > 0) return bars;
    } catch { /* try next host */ }
  }
  return [];
}

// ── Batch quote (price + name + mktcap) ──────────────────────────────────────

type QuickQuote = {
  symbol: string; name: string; price: number;
  changePct: number; volume: number; avgVol3m: number;
  marketCapM: number; week52High: number; week52Low: number;
};

async function batchQuote(symbols: string[]): Promise<QuickQuote[]> {
  const syms   = symbols.map(yfSym).join(',');
  const fields = 'symbol,shortName,regularMarketPrice,regularMarketChangePercent,regularMarketVolume,averageDailyVolume3Month,marketCap,fiftyTwoWeekHigh,fiftyTwoWeekLow';

  for (const host of ['query2', 'query1']) {
    const baseUrl = `https://${host}.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(syms)}&fields=${fields}&lang=en-US&region=US`;
    try {
      const r = await fetch(withCrumb(baseUrl), { headers: yfHeaders(), cache: 'no-store' });
      if (!r.ok) continue;
      const json = await r.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = (json?.quoteResponse?.result ?? []).map((q: any) => ({
        symbol:     q.symbol,
        name:       q.shortName ?? q.symbol,
        price:      q.regularMarketPrice ?? 0,
        changePct:  q.regularMarketChangePercent ?? 0,
        volume:     q.regularMarketVolume ?? 0,
        avgVol3m:   q.averageDailyVolume3Month ?? 0,
        marketCapM: (q.marketCap ?? 0) / 1_000_000,
        week52High: q.fiftyTwoWeekHigh ?? 0,
        week52Low:  q.fiftyTwoWeekLow ?? 0,
      })).filter((q: QuickQuote) => q.price >= 3 && q.marketCapM >= 100 && q.avgVol3m >= 100_000);
      if (results.length > 0) return results;
    } catch { /* try next host */ }
  }
  return [];
}

// ── Per-stock analysis ────────────────────────────────────────────────────────

function analyseStock(
  qq: QuickQuote,
  bars: Bar[],
  spyRet60d: number,
): PreBreakoutResult | null {
  if (bars.length < 210) return null;   // need 200d MA + buffer

  const closes  = bars.map(b => b.c);
  const volumes = bars.map(b => b.v);
  const n       = closes.length;

  // ── MA calculations ──────────────────────────────────────────────────────
  const ma50  = sma(closes, 50);
  const ma150 = sma(closes, 150);
  const ma200 = sma(closes, 200);
  if (!ma50 || !ma150 || !ma200) return null;

  const price      = closes[n - 1];
  const pctAbove50  = ((price - ma50)  / ma50)  * 100;
  const pctAbove200 = ((price - ma200) / ma200) * 100;

  // ── Signal 1: Stage ──────────────────────────────────────────────────────
  let stage: Stage;
  if      (price > ma50 && ma50 > ma150 && ma150 > ma200) stage = 'stage2';
  else if (price > ma50 && ma50 > ma200)                  stage = 'stage2-early';
  else if (Math.abs(pctAbove200) < 10)                    stage = 'stage1';
  else if (pctAbove50 > 25 && pctAbove200 > 40)           stage = 'stage3';
  else                                                    stage = 'stage4';

  // Only proceed if Stage 2, Stage 2-early, or Stage 1 (base forming)
  if (stage === 'stage4') return null;

  // ── Signal 2: Base tightness (last 20 sessions) ──────────────────────────
  const base20 = bars.slice(-20);
  const baseHigh = Math.max(...base20.map(b => b.h));
  const baseLow  = Math.min(...base20.map(b => b.l));
  const baseRangePct = baseLow > 0 ? ((baseHigh - baseLow) / baseLow) * 100 : 999;
  const inBase = baseRangePct <= 15;

  // ── Signal 3: Up/Down volume ratio (20 sessions) ─────────────────────────
  let upVol = 0, downVol = 0;
  for (let i = n - 20; i < n; i++) {
    if (closes[i] >= closes[i - 1]) upVol   += volumes[i];
    else                             downVol += volumes[i];
  }
  const upDownVolRatio = downVol > 0 ? upVol / downVol : (upVol > 0 ? 99 : 1);

  // ── Signal 4: Relative Strength vs SPY (60 days) ─────────────────────────
  if (n < 61) return null;
  const stockRet60d = closes[n - 61] > 0
    ? ((closes[n - 1] - closes[n - 61]) / closes[n - 61]) * 100
    : 0;
  const rs60d = stockRet60d - spyRet60d;
  const rsGrading: PreBreakoutResult['rsGrading'] =
    rs60d >= 5  ? 'outperforming' :
    rs60d >= -5 ? 'in-line'       : 'underperforming';

  // ── Signal 5: Volume Dry-Up ───────────────────────────────────────────────
  const avg50dVol  = volumes.slice(-50).reduce((a, b) => a + b, 0) / 50;
  const last5dVol  = volumes.slice(-5).reduce((a, b) => a + b, 0)  / 5;
  const vduRatio   = avg50dVol > 0 ? last5dVol / avg50dVol : 1;
  const vdu        = vduRatio < 0.7;  // last 5d avg < 70% of 50d avg

  // ── Signal 6: Pocket Pivot ────────────────────────────────────────────────
  // Today's volume must exceed the highest DOWN-day volume in the prior 10 bars
  const prior10 = bars.slice(-11, -1);
  const maxDownVol = prior10
    .filter((b, i) => i > 0 && b.c < prior10[i - 1]?.c)
    .reduce((mx, b) => Math.max(mx, b.v), 0);
  const todayVol   = volumes[n - 1];
  const ppVolRatio = maxDownVol > 0 ? todayVol / maxDownVol : 0;
  // Pocket pivot: today is an up day AND volume exceeds max down-day vol
  const pocketPivot = closes[n - 1] > closes[n - 2] && ppVolRatio > 1.0;

  // ── Signal 7: OBV trend ───────────────────────────────────────────────────
  let obv = 0;
  const obvSeries: number[] = [];
  for (let i = 1; i < n; i++) {
    if      (closes[i] > closes[i - 1]) obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
    obvSeries.push(obv);
  }
  const slope = normSlope(obvSeries, 20);
  const obvTrend: PreBreakoutResult['obvTrend'] =
    slope >  0.01 ? 'rising' :
    slope < -0.01 ? 'falling' : 'flat';

  // ── Scoring (0–10) ────────────────────────────────────────────────────────
  let score = 0;
  const catalysts: string[] = [];

  // Stage score (max 3)
  if      (stage === 'stage2')       { score += 3; catalysts.push('Stage 2 uptrend — perfect IBD trend template'); }
  else if (stage === 'stage2-early') { score += 2; catalysts.push('Stage 2 early — price above 50d & 200d MA'); }
  else if (stage === 'stage1')       { score += 1; catalysts.push('Stage 1 base — building foundation near 200d MA'); }

  // Base tightness (max 2)
  if (baseRangePct <= 8)  { score += 2; catalysts.push(`Tight base ${baseRangePct.toFixed(1)}% range — energy coiling for move`); }
  else if (inBase)        { score += 1; catalysts.push(`Consolidating base ${baseRangePct.toFixed(1)}% range`); }

  // Up/Down vol ratio (max 2)
  if      (upDownVolRatio >= 2.0) { score += 2; catalysts.push(`Strong up/down vol ratio ${upDownVolRatio.toFixed(2)}× — institutions buying`); }
  else if (upDownVolRatio >= 1.3) { score += 1; catalysts.push(`Positive up/down vol ratio ${upDownVolRatio.toFixed(2)}×`); }

  // Relative strength (max 2)
  if      (rs60d >= 10) { score += 2; catalysts.push(`RS +${rs60d.toFixed(1)}% vs SPY — strong institutional rotation in`); }
  else if (rs60d >= 3)  { score += 1; catalysts.push(`RS +${rs60d.toFixed(1)}% vs SPY — outperforming market`); }

  // Volume dry-up (max 1) — only add if in base
  if (vdu && inBase) { score += 1; catalysts.push(`Volume drying up (${(vduRatio * 100).toFixed(0)}% of avg) — no distribution selling`); }

  // Pocket pivot bonus (no score add, but flag it)
  if (pocketPivot) catalysts.push(`🔥 Pocket Pivot detected — entry signal (vol ${ppVolRatio.toFixed(1)}× max down-day)`);

  // OBV rising bonus (already partially in vol ratio, small bonus)
  if (obvTrend === 'rising') {
    score = Math.min(10, score + 1);
    catalysts.push('OBV rising — hidden accumulation');
  }

  // 52-week proximity bonus
  const fromHigh = qq.week52High > 0
    ? ((qq.week52High - price) / qq.week52High) * 100 : 100;
  if (fromHigh <= 5)  { score = Math.min(10, score + 1); catalysts.push(`Within ${fromHigh.toFixed(1)}% of 52-week high — breakout imminent`); }

  // Penalty: bad relative strength
  if (rsGrading === 'underperforming') { score = Math.max(0, score - 1); catalysts.push(`RS −${Math.abs(rs60d).toFixed(1)}% vs SPY — underperforming market`); }

  // ── Grade ─────────────────────────────────────────────────────────────────
  const grade: SetupGrade =
    score >= 8 ? 'A' :
    score >= 6 ? 'B' :
    score >= 4 ? 'C' : 'D';

  return {
    symbol:       qq.symbol,
    name:         qq.name,
    sector:       '',
    price,
    changePct:    qq.changePct,
    marketCapM:   qq.marketCapM,
    avgVolume:    qq.avgVol3m,
    stage,
    ma50,
    ma150,
    ma200,
    pctAbove50,
    pctAbove200,
    baseRangePct,
    baseHigh,
    baseLow,
    inBase,
    upDownVolRatio,
    upVol,
    downVol,
    rs60d,
    stockRet60d,
    spyRet60d,
    rsGrading,
    vdu,
    vduRatio,
    pocketPivot,
    ppVolRatio,
    obvTrend,
    obvSlope: slope,
    week52High: qq.week52High,
    week52Low:  qq.week52Low,
    fromHigh,
    score,
    grade,
    catalysts,
  };
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export async function runPreBreakoutScanner(
  universe: string[],
  maxResults = 40,
): Promise<PreBreakoutResult[]> {

  // ── Phase 0: Initialise YF session (crumb + cookie) ─────────────────────
  await ensureYFSession();

  // ── Phase 1: Get SPY baseline return ────────────────────────────────────
  const spyBars = await fetchBars('SPY', '1y');
  const spyRet60d = spyBars.length >= 61
    ? ((spyBars[spyBars.length - 1].c - spyBars[spyBars.length - 61].c) /
        spyBars[spyBars.length - 61].c) * 100
    : 0;

  // ── Phase 2: Batch quote filter ──────────────────────────────────────────
  const BATCH = 50;
  const allQuotes: QuickQuote[] = [];
  for (let i = 0; i < universe.length; i += BATCH) {
    const quotes = await batchQuote(universe.slice(i, i + BATCH));
    allQuotes.push(...quotes);
    if (i + BATCH < universe.length) await new Promise(r => setTimeout(r, 200));
  }

  // Pre-filter: only look at stocks within 25% of their 52-week high
  // (stocks in deep corrections rarely have pre-breakout setups)
  const nearHighCandidates = allQuotes.filter(q => {
    if (!q.week52High || q.week52High <= 0) return true;
    const fromHigh = ((q.week52High - q.price) / q.week52High) * 100;
    return fromHigh <= 30;
  });

  // Sort by apparent relative strength (simple: use 52w position as proxy)
  nearHighCandidates.sort((a, b) => {
    const rsA = a.week52High > a.week52Low ? (a.price - a.week52Low) / (a.week52High - a.week52Low) : 0;
    const rsB = b.week52High > b.week52Low ? (b.price - b.week52Low) / (b.week52High - b.week52Low) : 0;
    return rsB - rsA;
  });

  // Take top 120 for full candle analysis (larger with expanded universe)
  const candidates = nearHighCandidates.slice(0, 120);

  // ── Phase 3: Full candle analysis (concurrency-limited) ─────────────────
  const CONCURRENCY = 5;
  const results: PreBreakoutResult[] = [];

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const barResults = await Promise.all(batch.map(q => fetchBars(q.symbol, '1y')));
    for (let j = 0; j < batch.length; j++) {
      const analysis = analyseStock(batch[j], barResults[j], spyRet60d);
      if (analysis && analysis.score >= 3) {   // minimum score to include
        results.push(analysis);
      }
    }
    if (i + CONCURRENCY < candidates.length) await new Promise(r => setTimeout(r, 150));
  }

  // ── Sort: A grades first, then by score, then pocket pivots to top ───────
  results.sort((a, b) => {
    // Pocket pivots bubble up within same grade
    if (a.grade !== b.grade) {
      return a.grade.localeCompare(b.grade);  // A < B < C < D
    }
    // Pocket pivot bonus within same grade
    const ppA = a.pocketPivot ? 1 : 0;
    const ppB = b.pocketPivot ? 1 : 0;
    if (ppA !== ppB) return ppB - ppA;
    return b.score - a.score;
  });

  return results.slice(0, maxResults);
}
