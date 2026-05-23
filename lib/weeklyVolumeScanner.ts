/**
 * Weekly Volume Surge Scanner
 *
 * Scans all ~6,000-8,000 US-listed stocks to find those with unusual
 * price-volume activity over the PAST 5 TRADING DAYS vs their baseline.
 *
 * Signals:
 *   breakout          → Up 5%+ this week + volume 2× baseline
 *   surge-up          → Up 2%+ this week + volume 1.5× baseline
 *   quiet-accumulation→ Price flat (±2%) + volume 1.5× baseline (hidden buying)
 *   surge-down        → Down 2%+ this week + volume 1.5× baseline
 *   breakdown         → Down 5%+ this week + volume 2× baseline
 *   normal            → Nothing unusual
 */

import { ensureYFSession, yfHeaders, withCrumb, yfSym } from './yfClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WeeklySignal =
  | 'breakout'
  | 'surge-up'
  | 'quiet-accumulation'
  | 'distribution'          // high vol + flat price but down-days carry the volume
  | 'surge-down'
  | 'breakdown'
  | 'normal';

export type WeeklyDay = {
  date:      string;   // e.g. "Mon 5/19"
  close:     number;
  changePct: number;   // day's change vs prior close
  volume:    number;
  volRatio:  number;   // day vol / 3m avg daily vol
};

export type WeeklyVolumeResult = {
  symbol:       string;
  name:         string;

  price:        number;
  weekPricePct: number;   // 5-day price change %
  marketCapM:   number;
  avgDailyVol:  number;   // 3-month avg daily volume

  weekVol:      number;   // total volume past 5 trading days
  avgWeekVol:   number;   // baseline: avgDailyVol × 5
  weekVolRatio: number;   // weekVol / avgWeekVol  (the key metric)

  days:         WeeklyDay[];  // per-day breakdown (up to 5)

  signal:  WeeklySignal;
  score:   number;        // 0–10
};

// ── Fetch all US symbols (GitHub → fallback) ──────────────────────────────────

/** Regex: purely uppercase A-Z, 1–5 chars — filters out warrants (W), units (U), etc. */
const CLEAN_TICKER = /^[A-Z]{1,5}$/;

async function fetchUSSymbols(): Promise<string[]> {
  // Primary: GitHub repo with all US-listed tickers (~6,800 symbols)
  try {
    const r = await fetch(
      'https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/all/all_tickers.txt',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' },
    );
    if (r.ok) {
      const text = await r.text();
      const syms = text
        .split('\n')
        .map(s => s.trim().toUpperCase())
        .filter(s => CLEAN_TICKER.test(s));
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
  if (symbols.size > 500) return [...symbols];

  // Last resort: return empty (caller falls back to static list)
  return [];
}

// ── Batch quote ───────────────────────────────────────────────────────────────

type QuickQuote = {
  symbol:     string;
  name:       string;
  price:      number;
  changePct:  number;
  volume:     number;
  avgVol10d:  number;
  avgVol3m:   number;
  marketCapM: number;
  week52High: number;
  week52Low:  number;
};

async function batchQuote(symbols: string[]): Promise<QuickQuote[]> {
  const syms   = symbols.map(yfSym).join(',');
  const fields = 'symbol,shortName,regularMarketPrice,regularMarketChangePercent,' +
    'regularMarketVolume,averageDailyVolume10Day,averageDailyVolume3Month,' +
    'marketCap,fiftyTwoWeekHigh,fiftyTwoWeekLow';

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
        week52High: (q.fiftyTwoWeekHigh ?? 0) as number,
        week52Low:  (q.fiftyTwoWeekLow ?? 0) as number,
      })).filter(q =>
        q.price >= 10 &&           // price floor
        q.avgVol3m >= 500_000      // 20-day avg vol floor (~3m avg proxy)
      );
      if (mapped.length > 0) return mapped;
    } catch { /* try next host */ }
  }
  return [];
}

// ── 5-day candle fetch ────────────────────────────────────────────────────────

type Bar = { date: string; close: number; volume: number };

async function fetchWeekBars(symbol: string): Promise<Bar[]> {
  for (const host of ['query2', 'query1']) {
    const base =
      `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym(symbol))}` +
      `?interval=1d&range=10d`;   // 10d range gives us 5+ trading days even over a long weekend
    try {
      const r = await fetch(withCrumb(base), { headers: yfHeaders(), cache: 'no-store' });
      if (!r.ok) continue;
      const json  = await r.json();
      const res   = json?.chart?.result?.[0];
      if (!res) continue;
      const ts: number[]  = res.timestamp ?? [];
      const q             = res.indicators?.quote?.[0] ?? {};
      const closes:  (number | null)[] = q.close  ?? [];
      const volumes: (number | null)[] = q.volume ?? [];
      const bars: Bar[] = ts
        .map((t, i) => {
          const d   = new Date(t * 1000);
          const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
          const date = `${day} ${d.getMonth() + 1}/${d.getDate()}`;
          return { date, close: closes[i] as number, volume: (volumes[i] as number) ?? 0 };
        })
        .filter(b => b.close != null && b.close > 0);
      if (bars.length >= 3) return bars.slice(-5); // last 5 trading days
    } catch { /* try next host */ }
  }
  return [];
}

// ── Signal + score ────────────────────────────────────────────────────────────

function classify(weekVolRatio: number, weekPricePct: number, days: WeeklyDay[]): WeeklySignal {
  const bigVol   = weekVolRatio >= 2.0;
  const elevVol  = weekVolRatio >= 1.5;
  const bigUp    = weekPricePct >= 5;
  const modUp    = weekPricePct >= 2;
  const flat     = weekPricePct > -2 && weekPricePct < 2;
  const modDown  = weekPricePct <= -2;
  const bigDown  = weekPricePct <= -5;

  if (bigVol  && bigUp)   return 'breakout';
  if (elevVol && modUp)   return 'surge-up';

  if (elevVol && flat) {
    // Split volume into up-days vs down-days to distinguish
    // true accumulation (buying absorption) from distribution (selling into strength)
    const upVol   = days.filter(d => d.changePct >= 0).reduce((s, d) => s + d.volume, 0);
    const downVol = days.filter(d => d.changePct <  0).reduce((s, d) => s + d.volume, 0);
    const total   = upVol + downVol;
    const downFrac = total > 0 ? downVol / total : 0.5;

    // >55% of the week's volume hit on down days → distribution, not accumulation
    if (downFrac > 0.55) return 'distribution';
    return 'quiet-accumulation';
  }

  if (bigVol  && bigDown) return 'breakdown';
  if (elevVol && modDown) return 'surge-down';
  return 'normal';
}

function scoreResult(signal: WeeklySignal, weekVolRatio: number, weekPricePct: number): number {
  const volBonus = Math.min(3, Math.floor((weekVolRatio - 1) * 2)); // 0–3 from ratio
  switch (signal) {
    case 'breakout':           return Math.min(10, 7 + volBonus);
    case 'surge-up':           return Math.min(10, 6 + volBonus);
    case 'quiet-accumulation': return Math.min(10, 5 + volBonus);
    case 'distribution':       return Math.max(0,  4 - volBonus);
    case 'breakdown':          return Math.max(0,  3 - volBonus);
    case 'surge-down':         return Math.max(0,  2 - volBonus);
    default:                   return 3;
  }
  void weekPricePct;
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export async function runWeeklyVolumeScanner(
  fallbackUniverse: string[],
  maxResults = 50,
): Promise<WeeklyVolumeResult[]> {

  // ── Phase 0: YF session ──────────────────────────────────────────────────
  await ensureYFSession();

  // ── Phase 1: Get all US symbols ──────────────────────────────────────────
  let universe = await fetchUSSymbols();
  if (universe.length < 500) {
    // Use fallback static list
    universe = [...new Set([...fallbackUniverse])];
  }

  // ── Phase 2: Batch-quote all symbols (batches of 100, concurrency 3) ────
  const BATCH  = 100;
  const CONC   = 3;
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

  // ── Phase 3: Pre-filter by volume proxy — avgVol10d vs avgVol3m ─────────
  // This quickly surfaces stocks with elevated RECENT volume vs their baseline
  const withRatio = allQuotes
    .filter(q => q.avgVol3m > 0)
    .map(q => ({
      ...q,
      recentRatio: q.avgVol10d > 0 ? q.avgVol10d / q.avgVol3m : 1,
    }))
    .sort((a, b) => b.recentRatio - a.recentRatio);

  // Take top 200 candidates for full weekly candle analysis
  const candidates = withRatio.slice(0, 200);

  // ── Phase 4: 5-day candles for each candidate (concurrency 10) ──────────
  const CANDLE_CONC = 10;
  const results: WeeklyVolumeResult[] = [];

  for (let i = 0; i < candidates.length; i += CANDLE_CONC) {
    const batch = candidates.slice(i, i + CANDLE_CONC);
    const barResults = await Promise.all(batch.map(q => fetchWeekBars(q.symbol)));

    for (let j = 0; j < batch.length; j++) {
      const qq   = batch[j];
      const bars = barResults[j];
      if (bars.length < 3) continue; // need at least 3 days

      const weekVol    = bars.reduce((s, b) => s + b.volume, 0);
      const avgWeekVol = qq.avgVol3m * 5;
      if (avgWeekVol <= 0) continue;

      const weekVolRatio  = weekVol / avgWeekVol;
      if (weekVolRatio < 1.3) continue; // must have at least 30% above-avg volume to be interesting

      const firstClose    = bars[0].close;
      const lastClose     = bars[bars.length - 1].close;
      const weekPricePct  = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;

      // Build per-day breakdown
      const days: WeeklyDay[] = bars.map((b, idx) => {
        const prevClose = idx === 0 ? b.close : bars[idx - 1].close;
        const changePct = prevClose > 0 ? ((b.close - prevClose) / prevClose) * 100 : 0;
        return {
          date:      b.date,
          close:     b.close,
          changePct: idx === 0 ? 0 : changePct,
          volume:    b.volume,
          volRatio:  qq.avgVol3m > 0 ? b.volume / qq.avgVol3m : 0,
        };
      });

      const signal = classify(weekVolRatio, weekPricePct, days);
      const score  = scoreResult(signal, weekVolRatio, weekPricePct);

      results.push({
        symbol:       qq.symbol,
        name:         qq.name,
        price:        lastClose,
        weekPricePct,
        marketCapM:   qq.marketCapM,
        avgDailyVol:  qq.avgVol3m,
        weekVol,
        avgWeekVol,
        weekVolRatio,
        days,
        signal,
        score,
      });
    }

    if (i + CANDLE_CONC < candidates.length) {
      await new Promise(r => setTimeout(r, 120));
    }
  }

  // ── Sort: breakouts first, then by score, then by volume ratio ───────────
  const ORDER: Record<WeeklySignal, number> = {
    'breakout':           0,
    'surge-up':           1,
    'quiet-accumulation': 2,
    'normal':             3,
    'distribution':       4,
    'surge-down':         5,
    'breakdown':          6,
  };

  results.sort((a, b) => {
    const os = ORDER[a.signal] - ORDER[b.signal];
    if (os !== 0) return os;
    return b.weekVolRatio - a.weekVolRatio;
  });

  return results.slice(0, maxResults);
}
