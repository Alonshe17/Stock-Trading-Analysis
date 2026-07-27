/**
 * Pre-Market & Intraday Gappers Scanner
 *
 * Uses Yahoo Finance's all-market screener endpoints (day_gainers, day_losers,
 * most_actives) to discover movers across the entire US equity market — no
 * fixed stock universe required.
 *
 * Criteria:
 *  1. Gapped ≥ 2% from previous close (pre-market or intraday)
 *  2. ≥ 50,000 shares traded today
 *  3. Average daily volume > 300,000
 *  4. Price ≥ $1.00 (exclude sub-penny stocks)
 *  5. ATR ≥ $0.50 (14-day Average True Range)
 *  6. Short interest ≤ 30% of float
 *
 * Returns two lists: preMarket gappers and intraday (live) gappers.
 */

import { ensureYFSession, yfHeaders, withCrumb, yfSym } from './yfClient';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const DELAY_MS = 60;

// Wraps fetch with a hard timeout so one slow API call never blocks the scanner
function fetchWithTimeout(url: string, opts: RequestInit, ms = 5000): Promise<Response> {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal })
    .finally(() => clearTimeout(id));
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type CatalystType =
  | 'Earnings Beat'
  | 'Earnings Miss'
  | 'Earnings Report'
  | 'FDA Approval'
  | 'FDA Rejection'
  | 'FDA Catalyst'
  | 'M&A / Acquisition'
  | 'Partnership / Alliance'
  | 'Major Contract'
  | 'Analyst Upgrade'
  | 'Analyst Downgrade'
  | 'Price Target Raise'
  | 'Stock Split'
  | 'Share Buyback'
  | 'Debt Offering'
  | 'Restructuring / Layoffs'
  | 'Management Change'
  | 'Product Launch'
  | 'Short Squeeze Setup'
  | 'Unknown / Sector Move';

export type TradingStrategy =
  | 'Gap and Go'
  | 'Opening Range Breakout (ORB)'
  | 'Gap Fill / Reversal'
  | 'VWAP Reclaim'
  | 'Fade the Gap (Short)'
  | 'Short Squeeze Watch'
  | 'Momentum Continuation';

export type GapType = 'pre-market' | 'intraday';

export type GapperResult = {
  symbol: string;
  name: string;
  sector: string;
  gapType: GapType;
  gapDirection: 'up' | 'down';

  price: number;
  prevClose: number;
  gapPct: number;

  volumeToday: number;
  avgDailyVolume: number;
  volRatio: number;

  atr: number;
  floatSharesM: number | null;
  shortInterestPct: number | null;

  support: number;
  resistance: number;

  catalystType: CatalystType;
  fundamentalCatalyst: string;
  newsHeadline: string;
  newsUrl: string;
  newsSource: string;
  newsAge: string;

  suggestedStrategy: TradingStrategy;
  strategyNote: string;
  riskLevel: 'Very High' | 'High' | 'Medium' | 'Low';
};

// ── Plain browser headers (no crumb) ─────────────────────────────────────────
// Used for screener + quoteSummary endpoints which work without crumb server-side.

const YF_PLAIN = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://finance.yahoo.com/',
};

// ── Step 1: Fetch all-market movers via Yahoo Finance screener ─────────────────

type ScreenerQuote = {
  symbol:                     string;
  shortName?:                 string;
  longName?:                  string;
  quoteType?:                 string;
  sector?:                    string;
  regularMarketPrice:         number;
  regularMarketPreviousClose: number;
  regularMarketOpen?:         number;
  regularMarketChangePercent: number;
  regularMarketVolume:        number;
  averageDailyVolume3Month?:  number;
  averageDailyVolume10Day?:   number;
  fiftyTwoWeekHigh?:          number;
  fiftyTwoWeekLow?:           number;
  marketCap?:                 number;
  preMarketPrice?:            number;
  preMarketChangePercent?:    number;
  fullExchangeName?:          string;
};

async function fetchScreener(scrId: string, count = 100): Promise<ScreenerQuote[]> {
  const path = `/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=${scrId}&count=${count}&start=0`;
  for (const base of ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`, { headers: YF_PLAIN, cache: 'no-store' }, 8000);
      if (!res.ok) continue;
      const data = await res.json();
      const quotes: ScreenerQuote[] = data?.finance?.result?.[0]?.quotes ?? [];
      if (quotes.length > 0) return quotes;
    } catch {
      // try next host
    }
  }
  return [];
}

// ── Step 2: Fetch 14-day ATR + support/resistance from daily candles ──────────

type OHLCV = { o: number; h: number; l: number; c: number; v: number };

function calcATR14(candles: OHLCV[]): number {
  if (candles.length < 2) return 0;
  const trs = candles.slice(1).map((c, i) => {
    const prev = candles[i];
    return Math.max(c.h - c.l, Math.abs(c.h - prev.c), Math.abs(c.l - prev.c));
  });
  const window = trs.slice(-14);
  return window.length > 0 ? window.reduce((a, b) => a + b, 0) / window.length : 0;
}

type ATRData = { atr: number; support: number; resistance: number };

async function fetchATRAndSR(symbol: string): Promise<ATRData> {
  try {
    const sym = yfSym(symbol);
    const url = withCrumb(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1mo`
    );
    const res = await fetchWithTimeout(url, { headers: yfHeaders(), cache: 'no-store' }, 5000);
    if (!res.ok) return { atr: 0, support: 0, resistance: 0 };
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { atr: 0, support: 0, resistance: 0 };

    const q              = result.indicators?.quote?.[0] ?? {};
    const ts: number[]   = result.timestamp ?? [];
    const opens: number[] = q.open   ?? [];
    const highs: number[] = q.high   ?? [];
    const lows: number[]  = q.low    ?? [];
    const closes: number[] = q.close ?? [];
    const vols: number[]  = q.volume ?? [];

    const candles: OHLCV[] = ts
      .map((_, i) => ({ o: opens[i], h: highs[i], l: lows[i], c: closes[i], v: vols[i] ?? 0 }))
      .filter(c => c.o != null && c.h != null && c.l != null && c.c != null);

    const atr     = calcATR14(candles);
    const recent  = candles.slice(-11, -1);
    const support    = recent.length > 0 ? Math.min(...recent.map(c => c.l)) : 0;
    const resistance = recent.length > 0 ? Math.max(...recent.map(c => c.h)) : 0;

    return { atr, support, resistance };
  } catch {
    return { atr: 0, support: 0, resistance: 0 };
  }
}

// ── Step 3: Fetch short interest from Nasdaq's free public API ────────────────
// Yahoo Finance v10/quoteSummary returns 401 for all server-side requests as of 2026.
// Nasdaq's API is free, requires no API key, and returns real settlement-date SI data.

const NASDAQ_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchShortInterestShares(symbol: string): Promise<number | null> {
  try {
    const url = `https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/short-interest?type=SHORT+INTEREST&limit=1&offset=0&sortColumn=settlementDate&sortOrder=DESC`;
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': NASDAQ_UA, Accept: 'application/json' },
      cache: 'no-store',
    }, 5000);
    if (!res.ok) return null;
    const data = await res.json();
    const rows: { interest?: string }[] = data?.data?.shortInterestTable?.rows ?? [];
    if (rows.length === 0) return null;
    const raw = rows[0].interest ?? '';
    const parsed = parseInt(raw.replace(/,/g, ''), 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

// ── Step 3b: Batch-fetch sector + industry via v7/finance/quote ───────────────
// The predefined screener endpoints don't include sector in their response.
// v7/finance/quote returns it for up to 100 symbols per call with plain headers.

async function fetchSectorMap(symbols: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (symbols.length === 0) return map;
  const CHUNK = 100;
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const chunk = symbols.slice(i, i + CHUNK);
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${chunk.join(',')}&formatted=false`;
    try {
      const res = await fetchWithTimeout(url, { headers: YF_PLAIN, cache: 'no-store' }, 8000);
      if (!res.ok) continue;
      const data = await res.json();
      const quotes: { symbol: string; sector?: string }[] = data?.quoteResponse?.result ?? [];
      for (const q of quotes) {
        if (q.sector) map.set(q.symbol, q.sector);
      }
    } catch { /* proceed without sector for this chunk */ }
    if (i + CHUNK < symbols.length) await sleep(DELAY_MS);
  }
  return map;
}

// ── Step 4: Fetch news + detect catalyst ─────────────────────────────────────

type NewsData = {
  catalystType: CatalystType;
  fundamentalCatalyst: string;
  newsHeadline: string;
  newsUrl: string;
  newsSource: string;
  newsAge: string;
};

async function fetchNews(symbol: string): Promise<NewsData> {
  const fallback: NewsData = {
    catalystType: 'Unknown / Sector Move',
    fundamentalCatalyst: 'No specific catalyst found. Likely sector rotation or broad market move.',
    newsHeadline: 'No recent news found',
    newsUrl: `https://finance.yahoo.com/quote/${symbol}`,
    newsSource: 'Yahoo Finance',
    newsAge: '',
  };

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=5&enableFuzzyQuery=false&type=news`;
    const res = await fetchWithTimeout(url, { headers: yfHeaders(), cache: 'no-store' }, 5000);
    if (!res.ok) return fallback;
    const data = await res.json();
    const news: { title?: string; link?: string; publisher?: string; providerPublishTime?: number }[] = data?.news ?? [];
    if (news.length === 0) return fallback;

    const top      = news[0];
    const allText  = news.map(n => n.title ?? '').join(' ');
    const catalystType = detectCatalyst(allText);

    return {
      catalystType,
      fundamentalCatalyst: buildCatalystDesc(catalystType, symbol),
      newsHeadline: top.title ?? '',
      newsUrl:      top.link  ?? `https://finance.yahoo.com/quote/${symbol}`,
      newsSource:   top.publisher ?? 'Yahoo Finance',
      newsAge:      formatAge(top.providerPublishTime ?? 0),
    };
  } catch {
    return fallback;
  }
}

function detectCatalyst(text: string): CatalystType {
  if (/fda (approv|approvable|clear|grant|accept)/i.test(text))                        return 'FDA Approval';
  if (/fda (reject|refuse|complete response letter|warning letter|clinical hold|delay)/i.test(text)) return 'FDA Rejection';
  if (/fda|nda |bla |pdufa|breakthrough therapy|510\(k\)|phase [1-3]|clinical trial/i.test(text))    return 'FDA Catalyst';
  if (/acqui|merger|takeover|buyout|deal worth/i.test(text))                           return 'M&A / Acquisition';
  if (/partner|alliance|collaborat|joint venture|license agreement/i.test(text))       return 'Partnership / Alliance';
  if (/\bcontract\b|award|selected|chosen|win(s|ning)? (contract|deal|bid)/i.test(text)) return 'Major Contract';
  if (/(beat|surpass|exceed|above) (estimates?|expectations?|consensus)/i.test(text) ||
      /record (revenue|earnings|quarter)|strong (results|quarter|earnings)/i.test(text)) return 'Earnings Beat';
  if (/(miss|below|disappoint|shortfall|weaker.than.expected)/i.test(text))            return 'Earnings Miss';
  if (/earnings|quarterly results|q[1-4] \d{4}|eps|revenue guidance|outlook/i.test(text)) return 'Earnings Report';
  if (/upgrad|raises? (price target|pt)|initiat.*buy|outperform/i.test(text))          return 'Analyst Upgrade';
  if (/downgrad|cut.*price target|reduces? pt|underperform|sell rating/i.test(text))   return 'Analyst Downgrade';
  if (/raises? price target|price target (increase|raised|boosted|hiked)/i.test(text)) return 'Price Target Raise';
  if (/stock split|splits? shares?/i.test(text))                                       return 'Stock Split';
  if (/buyback|share repurchas|repurchase program/i.test(text))                        return 'Share Buyback';
  if (/(secondary|equity|share|at.the.market|atm) offering|dilutive/i.test(text))      return 'Debt Offering';
  if (/layoff|job cut|restructur|reorgani|workforce reduction/i.test(text))            return 'Restructuring / Layoffs';
  if (/\bceo\b|\bcfo\b|\bcoo\b|appoints?|names? (new|a )|resign|steps? down|retir/i.test(text)) return 'Management Change';
  if (/launch|introduc|unveil|new product|new model|new service/i.test(text))          return 'Product Launch';
  return 'Unknown / Sector Move';
}

function buildCatalystDesc(type: CatalystType, symbol: string): string {
  const map: Record<CatalystType, string> = {
    'Earnings Beat':          `${symbol} beat analyst estimates on EPS and/or revenue — a strong fundamental catalyst. Institutions typically add to positions, creating sustained buying pressure for 1–3 sessions.`,
    'Earnings Miss':          `${symbol} missed earnings expectations — a negative fundamental catalyst. Expect sellers to dominate; look for dead-cat bounces to fade rather than buying the initial dip.`,
    'Earnings Report':        `${symbol} reported quarterly results. Compare actual EPS and revenue vs consensus estimates, plus any forward guidance changes, before taking a position.`,
    'FDA Approval':           `FDA approved a key drug or device for ${symbol} — one of the strongest positive catalysts in healthcare. These gaps frequently continue for 2–3 sessions on institutional buying.`,
    'FDA Rejection':          `FDA rejected or issued a complete response letter for ${symbol}. Expect sustained selling pressure; avoid catching the falling knife on day one.`,
    'FDA Catalyst':           `${symbol} has an active FDA-related event (trial data, PDUFA date, or advisory committee meeting) — a binary risk event with potentially explosive moves in either direction.`,
    'M&A / Acquisition':      `${symbol} is involved in a merger or acquisition. If it is the target, the gap toward the offer price is typically permanent. If it is the acquirer, watch for dilution-driven selling.`,
    'Partnership / Alliance': `${symbol} announced a strategic partnership, collaboration, or licensing agreement — validates the business model and often signals institutional interest in the sector.`,
    'Major Contract':         `${symbol} won or lost a major contract. Contract wins can drive multi-day runs; contract losses often pressure the stock for several sessions as estimates get revised down.`,
    'Analyst Upgrade':        `An analyst upgraded ${symbol} — a positive catalyst but weaker than earnings. The gap may partially fill; look for institutional follow-through before committing size.`,
    'Analyst Downgrade':      `An analyst downgraded ${symbol} — a negative catalyst. Gap-downs on downgrades often see partial fills as value buyers step in, creating fade-the-bounce opportunities.`,
    'Price Target Raise':     `One or more analysts raised their price target on ${symbol} — minor positive catalyst that reinforces the existing bullish thesis without changing the fundamental picture.`,
    'Stock Split':            `${symbol} announced a stock split — historically bullish as it increases retail accessibility and signals management confidence. The gap is typically sustained.`,
    'Share Buyback':          `${symbol} announced a share repurchase program — bullish signal indicating management believes the stock is undervalued. Creates a price floor at key support levels.`,
    'Debt Offering':          `${symbol} is conducting a share or debt offering — dilutive to existing holders. Gap-downs on offerings tend to continue for 1–2 sessions as supply hits the market.`,
    'Restructuring / Layoffs':`${symbol} announced restructuring or layoffs — initially bullish (cost-cutting narrative) but signals underlying business challenges. Watch the stock's reaction to the initial bounce.`,
    'Management Change':      `${symbol} has a key leadership change. New CEO appointments can be bullish if the incoming exec has a strong track record; unexpected departures are typically bearish.`,
    'Product Launch':         `${symbol} launched or unveiled a new product or service — a positive catalyst if the market validates the opportunity. Watch early commercial traction data.`,
    'Short Squeeze Setup':    `${symbol} has elevated short interest; a gap against short sellers could trigger a squeeze with explosive upside. These moves can be violent but also reverse just as quickly.`,
    'Unknown / Sector Move':  `No specific fundamental catalyst identified for ${symbol}. The gap may reflect sector rotation, macro developments, or undisclosed news. Trade with extra caution and tighter stops.`,
  };
  return map[type] ?? '';
}

function formatAge(unixSec: number): string {
  if (!unixSec) return '';
  const diffMin = Math.floor((Date.now() - unixSec * 1000) / 60_000);
  if (diffMin < 60)  return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr  < 24)  return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

// ── Strategy selector ─────────────────────────────────────────────────────────

function selectStrategy(
  price: number,
  gapPct: number,
  gapDir: 'up' | 'down',
  catalystType: CatalystType,
  avgVol: number,
  shortInterestPct: number | null,
  atr: number,
  floatSharesM: number | null,
  resistance: number,
  support: number,
): { strategy: TradingStrategy; note: string; riskLevel: 'Very High' | 'High' | 'Medium' | 'Low' } {
  const abs       = Math.abs(gapPct);
  const isStrong  = ['Earnings Beat','FDA Approval','M&A / Acquisition','Stock Split','Share Buyback','Partnership / Alliance','Major Contract'].includes(catalystType);
  const isWeak    = ['Unknown / Sector Move','Analyst Upgrade','Analyst Downgrade','Price Target Raise'].includes(catalystType);
  const highShortI = shortInterestPct != null && shortInterestPct > 20;
  const smallFloat = floatSharesM     != null && floatSharesM < 50;
  const highAvgVol = avgVol > 5_000_000;

  if (abs >= 12) {
    return {
      strategy: 'Opening Range Breakout (ORB)',
      note: `${abs.toFixed(1)}% gap is extreme — chasing the open is dangerous. Let the first 15–30 min establish a range, then enter on a confirmed break of the high (long) or low (short) with above-average volume. Stop at the opposite end of the range. Target: 1–2× range size.`,
      riskLevel: 'Very High',
    };
  }

  if (highShortI && gapDir === 'up' && abs >= 3) {
    return {
      strategy: 'Short Squeeze Watch',
      note: `Short interest of ${shortInterestPct?.toFixed(1)}% creates squeeze potential. Buy pullback to the 5-min low or VWAP after open with tight stop (1× ATR = $${atr.toFixed(2)}). Exits must be planned in advance — squeezes can reverse instantly. Target: $${(price * 1.05).toFixed(2)}–$${(price * 1.10).toFixed(2)}.`,
      riskLevel: 'Very High',
    };
  }

  if (abs >= 5 && isStrong && gapDir === 'up') {
    return {
      strategy: 'Gap and Go',
      note: `Strong catalyst + ${abs.toFixed(1)}% gap-up. Wait for the opening bell; if the first 5-min candle is green and closes near its high, buy the break of that candle's high. Stop: below the 5-min candle low or pre-market low. Target: $${resistance.toFixed(2)} (resistance) or a measured move equal to the gap size.`,
      riskLevel: 'High',
    };
  }

  if (abs >= 5 && isStrong && gapDir === 'down') {
    return {
      strategy: 'Momentum Continuation',
      note: `Strong negative catalyst + ${abs.toFixed(1)}% gap-down. Short the first dead-cat bounce (VWAP rejection or 5-min candle break). Stop: above pre-market high. Targets: $${support.toFixed(2)} (support), then a 50–100% gap fill. Do NOT bottom-fish until sellers are clearly exhausted.`,
      riskLevel: 'High',
    };
  }

  if (smallFloat && abs >= 4) {
    return {
      strategy: 'Momentum Continuation',
      note: `Small float (${floatSharesM?.toFixed(1)}M shares) + ${abs.toFixed(1)}% gap = high squeeze/momentum potential. Buy the break of the first 1-min candle high with volume. ATR = $${atr.toFixed(2)} — size accordingly (risk ≤ 1% account). Small floats can reverse violently: use a hard stop and have exit plan ready.`,
      riskLevel: 'Very High',
    };
  }

  if (abs < 4 && isWeak) {
    return {
      strategy: 'Gap Fill / Reversal',
      note: `Small ${abs.toFixed(1)}% gap on a ${catalystType.toLowerCase()} — ~70% of gaps under 4% fill the same day. ${gapDir === 'up' ? `Short the opening pop if price rejects VWAP or the pre-market high. Target: previous close $${price.toFixed(2)} → $${(price - Math.abs(price * gapPct / 100)).toFixed(2)}.` : `Buy if price finds support at VWAP or yesterday's close. Target: partial gap fill to $${(price + Math.abs(price * gapPct / 100) * 0.5).toFixed(2)}.`}`,
      riskLevel: 'Medium',
    };
  }

  if (isWeak && gapDir === 'up' && highAvgVol && abs >= 3) {
    return {
      strategy: 'Fade the Gap (Short)',
      note: `Weak catalyst (${catalystType}) on a high-liquidity stock — institutional sellers likely. Short the peak of the opening pop (first 2–3 min) with stop above the pre-market high ($${resistance.toFixed(2)}). Target: VWAP, then 50% of the gap. Works best when the broad market is flat or weak at open.`,
      riskLevel: 'High',
    };
  }

  return {
    strategy: 'VWAP Reclaim',
    note: `Wait for the post-open pullback to VWAP; enter when price reclaims VWAP with volume ≥ 2× the prior candle's volume. Stop: close below VWAP (risk ≈ $${(atr * 0.3).toFixed(2)}). Targets: $${(price + atr).toFixed(2)} (+1 ATR), then $${resistance.toFixed(2)} (resistance). This reduces risk vs chasing the open.`,
    riskLevel: 'Medium',
  };
}

// ── Build result object ───────────────────────────────────────────────────────

function buildFromScreener(
  quote: ScreenerQuote,
  gapType: GapType,
  price: number,
  prevClose: number,
  gapPct: number,
  atrData: ATRData,
): GapperResult {
  const avgVol     = quote.averageDailyVolume3Month ?? quote.averageDailyVolume10Day ?? 0;
  const support    = atrData.support    > 0 ? atrData.support    : (quote.fiftyTwoWeekLow  ?? 0);
  const resistance = atrData.resistance > 0 ? atrData.resistance : (quote.fiftyTwoWeekHigh ?? 0);

  return {
    symbol:           quote.symbol,
    name:             quote.longName ?? quote.shortName ?? quote.symbol,
    sector:           quote.sector ?? 'Various',
    gapType,
    gapDirection:     gapPct > 0 ? 'up' : 'down',
    price,
    prevClose,
    gapPct,
    volumeToday:      quote.regularMarketVolume,
    avgDailyVolume:   avgVol,
    volRatio:         avgVol > 0 ? quote.regularMarketVolume / avgVol : 0,
    atr:              atrData.atr,
    floatSharesM:     null,
    shortInterestPct: null,
    support,
    resistance,
    catalystType:         'Unknown / Sector Move',
    fundamentalCatalyst:  '',
    newsHeadline:         '',
    newsUrl:              `https://finance.yahoo.com/quote/${quote.symbol}`,
    newsSource:           '',
    newsAge:              '',
    suggestedStrategy:    'VWAP Reclaim',
    strategyNote:         '',
    riskLevel:            'High',
  };
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export async function runGappersScanner(): Promise<{ preMarket: GapperResult[]; intraday: GapperResult[] }> {
  await ensureYFSession();

  // ── Step 1: Fetch all-market top movers in parallel (3 screener feeds) ──────
  const [gainers, losers, actives] = await Promise.all([
    fetchScreener('day_gainers', 100),
    fetchScreener('day_losers',  50),
    fetchScreener('most_actives', 50),
  ]);

  // Deduplicate by symbol
  const seenSyms = new Set<string>();
  const allQuotes: ScreenerQuote[] = [];
  for (const q of [...gainers, ...losers, ...actives]) {
    if (!seenSyms.has(q.symbol)) {
      seenSyms.add(q.symbol);
      allQuotes.push(q);
    }
  }

  // ── Step 1b: Enrich screener quotes with sector data ─────────────────────────
  const sectorMap = await fetchSectorMap(allQuotes.map(q => q.symbol));
  for (const q of allQuotes) {
    if (!q.sector) q.sector = sectorMap.get(q.symbol);
  }

  // ── Step 2: Quick pre-filter ─────────────────────────────────────────────────
  const screened = allQuotes.filter(q => {
    if (q.quoteType && q.quoteType !== 'EQUITY') return false;  // skip ETFs, CEFs
    if (!q.regularMarketPreviousClose || q.regularMarketPreviousClose <= 0) return false;
    if (!q.regularMarketVolume  || q.regularMarketVolume  < 50_000)  return false;
    if (!q.regularMarketPrice   || q.regularMarketPrice   < 1)        return false; // sub-$1
    const avgVol = q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? 0;
    if (avgVol < 300_000) return false;
    return true;
  });

  // ── Step 3: Classify into pre-market and intraday gap candidates ─────────────
  type GapCandidate = { quote: ScreenerQuote; price: number; gapPct: number };
  const pmCandidates: GapCandidate[]  = [];
  const idCandidates: GapCandidate[]  = [];

  for (const q of screened) {
    const prev = q.regularMarketPreviousClose;

    // Pre-market: live preMarketPrice (4–9:30 AM ET) OR regularMarketOpen (gap at open, rest of day)
    const pmPrice = q.preMarketPrice ?? q.regularMarketOpen;
    if (pmPrice && prev > 0) {
      const pmGapPct = ((pmPrice - prev) / prev) * 100;
      if (Math.abs(pmGapPct) >= 2) {
        pmCandidates.push({ quote: q, price: pmPrice, gapPct: pmGapPct });
      }
    }

    // Intraday: current price vs previous close
    if (prev > 0) {
      const idGapPct = ((q.regularMarketPrice - prev) / prev) * 100;
      if (Math.abs(idGapPct) >= 2) {
        idCandidates.push({ quote: q, price: q.regularMarketPrice, gapPct: idGapPct });
      }
    }
  }

  // ── Step 4: Fetch ATR + S/R — parallel batches of 3, capped at MAX_CANDIDATES ─
  // Sort each list by absolute gap % so we enrich the biggest movers first.
  pmCandidates.sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct));
  idCandidates.sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct));

  const allSymbols = [
    ...new Set([
      ...pmCandidates.map(c => c.quote.symbol),
      ...idCandidates.map(c => c.quote.symbol),
    ]),
  ];

  const atrMap = new Map<string, ATRData>();
  const BATCH  = 10;
  for (let i = 0; i < allSymbols.length; i += BATCH) {
    const batch = allSymbols.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(s => fetchATRAndSR(s)));
    batch.forEach((s, j) => atrMap.set(s, results[j]));
    if (i + BATCH < allSymbols.length) await sleep(DELAY_MS);
  }

  // ── Step 5: Apply ATR filter and build result rows ────────────────────────────
  const preMarket: GapperResult[] = [];
  const intraday:  GapperResult[] = [];

  for (const { quote, price, gapPct } of pmCandidates) {
    const atrData = atrMap.get(quote.symbol) ?? { atr: 0, support: 0, resistance: 0 };
    if (atrData.atr > 0 && atrData.atr < 0.50) continue; // ATR filter (skip only if we got data)
    preMarket.push(buildFromScreener(quote, 'pre-market', price, quote.regularMarketPreviousClose, gapPct, atrData));
  }

  for (const { quote, price, gapPct } of idCandidates) {
    const atrData = atrMap.get(quote.symbol) ?? { atr: 0, support: 0, resistance: 0 };
    if (atrData.atr > 0 && atrData.atr < 0.50) continue;
    intraday.push(buildFromScreener(quote, 'intraday', price, quote.regularMarketPreviousClose, gapPct, atrData));
  }

  // ── Step 6: Enrich with short interest (Nasdaq API) + news ──────────────────
  // Float is approximated from screener's marketCap ÷ price (≈ shares outstanding).
  const quoteMap = new Map<string, ScreenerQuote>();
  for (const q of screened) quoteMap.set(q.symbol, q);

  // Collect unique symbols across both result lists
  const uniqueSymbols = [...new Set([...preMarket, ...intraday].map(g => g.symbol))];
  const siMap   = new Map<string, number | null>();
  const newsMap = new Map<string, NewsData>();
  const ENRICH_BATCH = 10;

  // Fetch SI + news in parallel batches of 10 (SI and news fetched simultaneously)
  for (let i = 0; i < uniqueSymbols.length; i += ENRICH_BATCH) {
    const batch = uniqueSymbols.slice(i, i + ENRICH_BATCH);
    const [siArr, newsArr] = await Promise.all([
      Promise.all(batch.map(s => fetchShortInterestShares(s))),
      Promise.all(batch.map(s => fetchNews(s))),
    ]);
    batch.forEach((s, j) => { siMap.set(s, siArr[j]); newsMap.set(s, newsArr[j]); });
    if (i + ENRICH_BATCH < uniqueSymbols.length) await sleep(DELAY_MS);
  }

  // Apply enrichment data; collect symbols to remove (SI > 30%)
  const toRemove = new Set<string>();

  for (const arr of [preMarket, intraday]) {
    for (const g of arr) {
      if (toRemove.has(g.symbol)) continue;

      const sq        = quoteMap.get(g.symbol);
      const marketCap = sq?.marketCap ?? 0;
      const sharesOut = marketCap > 0 && g.price > 0 ? marketCap / g.price : null;
      g.floatSharesM  = sharesOut ? sharesOut / 1_000_000 : null;

      const siShares     = siMap.get(g.symbol) ?? null;
      g.shortInterestPct = siShares !== null && sharesOut !== null && sharesOut > 0
        ? (siShares / sharesOut) * 100 : null;

      if (g.shortInterestPct !== null && g.shortInterestPct > 30) {
        toRemove.add(g.symbol);
        continue;
      }

      const news = newsMap.get(g.symbol);
      if (news) Object.assign(g, news);

      const { strategy, note, riskLevel } = selectStrategy(
        g.price, g.gapPct, g.gapDirection, g.catalystType,
        g.avgDailyVolume, g.shortInterestPct, g.atr, g.floatSharesM,
        g.resistance, g.support,
      );
      g.suggestedStrategy = strategy;
      g.strategyNote      = note;
      g.riskLevel         = riskLevel;
    }
  }

  // Remove high-SI stocks in-place from both lists
  for (const arr of [preMarket, intraday]) {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (toRemove.has(arr[i].symbol)) arr.splice(i, 1);
    }
  }

  // Sort by absolute gap % descending
  preMarket.sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct));
  intraday.sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct));

  return { preMarket, intraday };
}
