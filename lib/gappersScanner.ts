/**
 * Pre-Market & Intraday Gappers Scanner
 *
 * Criteria:
 *  1. Gapped ≥ 2% from previous close (pre-market or intraday)
 *  2. ≥ 50,000 shares traded today
 *  3. Average daily volume > 500,000
 *  4. ATR ≥ $0.50 (14-day Average True Range)
 *  5. Short interest ≤ 30% of float
 *
 * Returns two lists: preMarket gappers and intraday (live) gappers.
 */

import { ensureYFSession, yfHeaders, withCrumb, yfSym } from './yfClient';
// Note: yfHeaders/withCrumb are used only in fetchQuoteData (v8/chart endpoint).
// fetchFloatAndSI uses YF_PLAIN headers instead — see comment there.

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const DELAY_MS = 130;

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

// ── Day-trading universe (~95 high-volatility US stocks) ──────────────────────

type UniverseStock = { symbol: string; name: string; sector: string };

const GAPPERS_UNIVERSE: UniverseStock[] = [
  // Large-cap with high ATR — gap frequently on earnings/macro
  { symbol: 'TSLA',  name: 'Tesla',                    sector: 'Consumer Cyclical' },
  { symbol: 'NVDA',  name: 'NVIDIA',                   sector: 'Technology' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',   sector: 'Technology' },
  { symbol: 'AAPL',  name: 'Apple',                    sector: 'Technology' },
  { symbol: 'MSFT',  name: 'Microsoft',                sector: 'Technology' },
  { symbol: 'AMZN',  name: 'Amazon',                   sector: 'Consumer Cyclical' },
  { symbol: 'META',  name: 'Meta Platforms',           sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet',                 sector: 'Technology' },
  { symbol: 'NFLX',  name: 'Netflix',                  sector: 'Communication Services' },
  { symbol: 'AVGO',  name: 'Broadcom',                 sector: 'Technology' },
  { symbol: 'QCOM',  name: 'Qualcomm',                 sector: 'Technology' },
  { symbol: 'MU',    name: 'Micron Technology',        sector: 'Technology' },
  { symbol: 'ORCL',  name: 'Oracle',                   sector: 'Technology' },
  { symbol: 'CRM',   name: 'Salesforce',               sector: 'Technology' },
  { symbol: 'ADBE',  name: 'Adobe',                    sector: 'Technology' },
  // High-vol AI / speculative tech
  { symbol: 'SMCI',  name: 'Super Micro Computer',     sector: 'Technology' },
  { symbol: 'CRWD',  name: 'CrowdStrike',              sector: 'Technology' },
  { symbol: 'PLTR',  name: 'Palantir Technologies',    sector: 'Technology' },
  { symbol: 'SOUN',  name: 'SoundHound AI',            sector: 'Technology' },
  { symbol: 'BBAI',  name: 'BigBear.ai',               sector: 'Technology' },
  { symbol: 'IONQ',  name: 'IonQ',                     sector: 'Technology' },
  { symbol: 'AI',    name: 'C3.ai',                    sector: 'Technology' },
  { symbol: 'DDOG',  name: 'Datadog',                  sector: 'Technology' },
  { symbol: 'NET',   name: 'Cloudflare',               sector: 'Technology' },
  { symbol: 'SNOW',  name: 'Snowflake',                sector: 'Technology' },
  { symbol: 'PATH',  name: 'UiPath',                   sector: 'Technology' },
  { symbol: 'RKLB',  name: 'Rocket Lab',               sector: 'Industrials' },
  { symbol: 'APLD',  name: 'Applied Digital',          sector: 'Technology' },
  // Finance / Crypto
  { symbol: 'COIN',  name: 'Coinbase Global',          sector: 'Financial Services' },
  { symbol: 'HOOD',  name: 'Robinhood Markets',        sector: 'Financial Services' },
  { symbol: 'MSTR',  name: 'MicroStrategy',            sector: 'Technology' },
  { symbol: 'MARA',  name: 'Marathon Digital',         sector: 'Financial Services' },
  { symbol: 'RIOT',  name: 'Riot Platforms',           sector: 'Financial Services' },
  { symbol: 'SOFI',  name: 'SoFi Technologies',        sector: 'Financial Services' },
  { symbol: 'AFRM',  name: 'Affirm Holdings',          sector: 'Financial Services' },
  { symbol: 'UPST',  name: 'Upstart Holdings',         sector: 'Financial Services' },
  { symbol: 'PYPL',  name: 'PayPal',                   sector: 'Financial Services' },
  { symbol: 'SQ',    name: 'Block',                    sector: 'Financial Services' },
  { symbol: 'JPM',   name: 'JPMorgan Chase',           sector: 'Financial Services' },
  { symbol: 'GS',    name: 'Goldman Sachs',            sector: 'Financial Services' },
  { symbol: 'MS',    name: 'Morgan Stanley',           sector: 'Financial Services' },
  { symbol: 'BAC',   name: 'Bank of America',          sector: 'Financial Services' },
  // Healthcare / Biotech (frequent FDA catalysts)
  { symbol: 'LLY',   name: 'Eli Lilly',                sector: 'Healthcare' },
  { symbol: 'ABBV',  name: 'AbbVie',                   sector: 'Healthcare' },
  { symbol: 'MRNA',  name: 'Moderna',                  sector: 'Healthcare' },
  { symbol: 'BNTX',  name: 'BioNTech',                 sector: 'Healthcare' },
  { symbol: 'NVAX',  name: 'Novavax',                  sector: 'Healthcare' },
  { symbol: 'HIMS',  name: 'Hims & Hers Health',       sector: 'Healthcare' },
  { symbol: 'RXRX',  name: 'Recursion Pharmaceuticals',sector: 'Healthcare' },
  { symbol: 'UNH',   name: 'UnitedHealth Group',       sector: 'Healthcare' },
  { symbol: 'PFE',   name: 'Pfizer',                   sector: 'Healthcare' },
  { symbol: 'AMGN',  name: 'Amgen',                    sector: 'Healthcare' },
  { symbol: 'BIIB',  name: 'Biogen',                   sector: 'Healthcare' },
  { symbol: 'GILD',  name: 'Gilead Sciences',          sector: 'Healthcare' },
  { symbol: 'REGN',  name: 'Regeneron Pharmaceuticals',sector: 'Healthcare' },
  { symbol: 'VRTX',  name: 'Vertex Pharmaceuticals',   sector: 'Healthcare' },
  { symbol: 'INCY',  name: 'Incyte Corporation',       sector: 'Healthcare' },
  // EV / Clean Energy (volatile, popular with retail)
  { symbol: 'RIVN',  name: 'Rivian Automotive',        sector: 'Consumer Cyclical' },
  { symbol: 'NIO',   name: 'NIO',                      sector: 'Consumer Cyclical' },
  { symbol: 'LCID',  name: 'Lucid Group',              sector: 'Consumer Cyclical' },
  { symbol: 'XPEV',  name: 'XPeng',                    sector: 'Consumer Cyclical' },
  { symbol: 'PLUG',  name: 'Plug Power',               sector: 'Energy' },
  { symbol: 'FCEL',  name: 'FuelCell Energy',          sector: 'Energy' },
  { symbol: 'ENPH',  name: 'Enphase Energy',           sector: 'Technology' },
  { symbol: 'CHPT',  name: 'ChargePoint Holdings',     sector: 'Industrials' },
  { symbol: 'QS',    name: 'QuantumScape',             sector: 'Technology' },
  // Defense
  { symbol: 'LMT',   name: 'Lockheed Martin',          sector: 'Defense' },
  { symbol: 'RTX',   name: 'RTX Corp',                 sector: 'Defense' },
  { symbol: 'NOC',   name: 'Northrop Grumman',         sector: 'Defense' },
  { symbol: 'BA',    name: 'Boeing',                   sector: 'Industrials' },
  // Energy
  { symbol: 'XOM',   name: 'ExxonMobil',               sector: 'Energy' },
  { symbol: 'CVX',   name: 'Chevron',                  sector: 'Energy' },
  { symbol: 'OXY',   name: 'Occidental Petroleum',     sector: 'Energy' },
  // Consumer
  { symbol: 'WMT',   name: 'Walmart',                  sector: 'Consumer Defensive' },
  { symbol: 'COST',  name: 'Costco',                   sector: 'Consumer Defensive' },
  { symbol: 'NKE',   name: 'Nike',                     sector: 'Consumer Cyclical' },
  { symbol: 'DIS',   name: 'Walt Disney',              sector: 'Communication Services' },
  { symbol: 'SBUX',  name: 'Starbucks',                sector: 'Consumer Cyclical' },
  // Meme / retail favorites
  { symbol: 'GME',   name: 'GameStop',                 sector: 'Consumer Cyclical' },
  { symbol: 'AMC',   name: 'AMC Entertainment',        sector: 'Communication Services' },
  { symbol: 'SPCE',  name: 'Virgin Galactic',          sector: 'Industrials' },
  // Cannabis
  { symbol: 'TLRY',  name: 'Tilray Brands',            sector: 'Healthcare' },
  { symbol: 'CGC',   name: 'Canopy Growth',            sector: 'Healthcare' },
  { symbol: 'SNDL',  name: 'SNDL Inc',                sector: 'Consumer Defensive' },
  { symbol: 'ACB',   name: 'Aurora Cannabis',          sector: 'Healthcare' },
  // Other high-vol
  { symbol: 'NU',    name: 'Nu Holdings',              sector: 'Financial Services' },
  { symbol: 'UBER',  name: 'Uber Technologies',        sector: 'Technology' },
  { symbol: 'LYFT',  name: 'Lyft',                     sector: 'Technology' },
  { symbol: 'SNAP',  name: 'Snap',                     sector: 'Technology' },
  { symbol: 'PINS',  name: 'Pinterest',                sector: 'Technology' },
  { symbol: 'SPOT',  name: 'Spotify',                  sector: 'Communication Services' },
  { symbol: 'RBLX',  name: 'Roblox',                   sector: 'Technology' },
  { symbol: 'U',     name: 'Unity Software',           sector: 'Technology' },
  { symbol: 'CELH',  name: 'Celsius Holdings',         sector: 'Consumer Defensive' },
  { symbol: 'WKHS',  name: 'Workhorse Group',          sector: 'Industrials' },
];

// ── Helper: Calculate 14-day ATR ──────────────────────────────────────────────

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

// ── Step 1: Fetch quote + OHLCV (one call per stock) ─────────────────────────

type QuoteData = {
  regularMarketPrice: number;
  prevClose: number;
  regularMarketVolume: number;
  avgDailyVolume: number;
  /** Live pre-market price (4–9:30 AM ET). Null after open. */
  preMarketPrice: number | null;
  /** Today's opening candle price (available after 9:30 AM ET open). */
  todayOpenPrice: number | null;
  atr: number;
  support: number;
  resistance: number;
  name: string;
};

async function fetchQuoteData(symbol: string): Promise<QuoteData | null> {
  try {
    const sym = yfSym(symbol);
    const url = withCrumb(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1mo&prePost=true`
    );
    const res = await fetch(url, { headers: yfHeaders(), cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta ?? {};
    const ts: number[]      = result.timestamp ?? [];
    const q                 = result.indicators?.quote?.[0] ?? {};
    const opens: number[]   = q.open   ?? [];
    const highs: number[]   = q.high   ?? [];
    const lows: number[]    = q.low    ?? [];
    const closes: number[]  = q.close  ?? [];
    const vols: number[]    = q.volume ?? [];

    const candles: OHLCV[] = ts
      .map((_, i) => ({ o: opens[i], h: highs[i], l: lows[i], c: closes[i], v: vols[i] ?? 0 }))
      .filter(c => c.o != null && c.h != null && c.l != null && c.c != null);

    const atr = calcATR14(candles);

    // avg daily volume from historical candles (excluding today)
    const historicalVols = candles.slice(0, -1).map(c => c.v).filter(v => v > 0);
    const avgDailyVolume = historicalVols.length > 0
      ? historicalVols.reduce((a, b) => a + b, 0) / historicalVols.length
      : 0;

    // support / resistance: 10-day window excluding today
    const recent = candles.slice(-11, -1);
    const support    = recent.length > 0 ? Math.min(...recent.map(c => c.l)) : 0;
    const resistance = recent.length > 0 ? Math.max(...recent.map(c => c.h)) : 0;

    const regularMarketPrice  = meta.regularMarketPrice ?? 0;
    const prevClose           = meta.previousClose ?? meta.chartPreviousClose ?? 0;
    const regularMarketVolume = meta.regularMarketVolume ?? 0;
    const preMarketPrice      = meta.preMarketPrice ?? null;
    const name                = meta.longName ?? meta.shortName ?? symbol;

    // Today's open from the last daily candle — available during & after market hours
    // when Yahoo has already built today's candle from actual trading.
    const lastCandle   = candles.length > 0 ? candles[candles.length - 1] : null;
    const todayOpenPrice = (lastCandle && lastCandle.o > 0) ? lastCandle.o : null;

    return { regularMarketPrice, prevClose, regularMarketVolume, avgDailyVolume, preMarketPrice, todayOpenPrice, atr, support, resistance, name };
  } catch {
    return null;
  }
}

// ── Step 2: Fetch float + short interest ─────────────────────────────────────
// Uses plain browser headers without a crumb — mirrors the pattern in
// yahoofetch.ts (fetchYahooFundamentals) which is known to work server-side.
// withCrumb() / yfHeaders() are intentionally NOT used here because the crumb
// session is frequently invalid by the time these enrichment calls run.

const YF_PLAIN = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://finance.yahoo.com/',
};

function yfRaw(obj: Record<string, unknown>, key: string): number | null {
  const val = obj[key];
  if (val === null || val === undefined) return null;
  if (typeof val === 'object' && val !== null && 'raw' in val) {
    const r = (val as { raw: unknown }).raw;
    return typeof r === 'number' ? r : null;
  }
  return typeof val === 'number' ? val : null;
}

async function fetchFloatAndSI(symbol: string): Promise<{ floatSharesM: number | null; shortInterestPct: number | null }> {
  const sym  = yfSym(symbol);
  const path = `finance/quoteSummary/${encodeURIComponent(sym)}?modules=defaultKeyStatistics`;

  // Try query2 first, fall back to query1
  for (const host of ['https://query2.finance.yahoo.com/v10', 'https://query1.finance.yahoo.com/v10']) {
    try {
      const res = await fetch(`${host}/${path}`, { headers: YF_PLAIN, cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const ks: Record<string, unknown> = data?.quoteSummary?.result?.[0]?.defaultKeyStatistics ?? {};

      const floatShares   = yfRaw(ks, 'floatShares');
      const shortPctFloat = yfRaw(ks, 'shortPercentOfFloat');

      // Only return if we got at least one field
      if (floatShares !== null || shortPctFloat !== null) {
        return {
          floatSharesM:     floatShares   !== null ? floatShares / 1_000_000 : null,
          shortInterestPct: shortPctFloat !== null ? shortPctFloat * 100      : null,
        };
      }
    } catch {
      // try next host
    }
  }

  return { floatSharesM: null, shortInterestPct: null };
}

// ── Step 3: Fetch news + detect catalyst ─────────────────────────────────────

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
    const res = await fetch(url, { headers: yfHeaders(), cache: 'no-store' });
    if (!res.ok) return fallback;
    const data = await res.json();
    const news: { title?: string; link?: string; publisher?: string; providerPublishTime?: number }[] = data?.news ?? [];
    if (news.length === 0) return fallback;

    const top = news[0];
    const allText = news.map(n => n.title ?? '').join(' ');
    const catalystType = detectCatalyst(allText);

    return {
      catalystType,
      fundamentalCatalyst: buildCatalystDesc(catalystType, symbol),
      newsHeadline: top.title ?? '',
      newsUrl: top.link ?? `https://finance.yahoo.com/quote/${symbol}`,
      newsSource: top.publisher ?? 'Yahoo Finance',
      newsAge: formatAge(top.providerPublishTime ?? 0),
    };
  } catch {
    return fallback;
  }
}

function detectCatalyst(text: string): CatalystType {
  if (/fda (approv|approvable|clear|grant|accept)/i.test(text)) return 'FDA Approval';
  if (/fda (reject|refuse|complete response letter|warning letter|clinical hold|delay)/i.test(text)) return 'FDA Rejection';
  if (/fda|nda |bla |pdufa|breakthrough therapy|510\(k\)|phase [1-3]|clinical trial/i.test(text)) return 'FDA Catalyst';
  if (/acqui|merger|takeover|buyout|deal worth/i.test(text)) return 'M&A / Acquisition';
  if (/partner|alliance|collaborat|joint venture|license agreement/i.test(text)) return 'Partnership / Alliance';
  if (/\bcontract\b|award|selected|chosen|win(s|ning)? (contract|deal|bid)/i.test(text)) return 'Major Contract';
  if (/(beat|surpass|exceed|above) (estimates?|expectations?|consensus)/i.test(text) ||
      /record (revenue|earnings|quarter)|strong (results|quarter|earnings)/i.test(text)) return 'Earnings Beat';
  if (/(miss|below|disappoint|shortfall|weaker.than.expected)/i.test(text)) return 'Earnings Miss';
  if (/earnings|quarterly results|q[1-4] \d{4}|eps|revenue guidance|outlook/i.test(text)) return 'Earnings Report';
  if (/upgrad|raises? (price target|pt)|initiat.*buy|outperform/i.test(text)) return 'Analyst Upgrade';
  if (/downgrad|cut.*price target|reduces? pt|underperform|sell rating/i.test(text)) return 'Analyst Downgrade';
  if (/raises? price target|price target (increase|raised|boosted|hiked)/i.test(text)) return 'Price Target Raise';
  if (/stock split|splits? shares?/i.test(text)) return 'Stock Split';
  if (/buyback|share repurchas|repurchase program/i.test(text)) return 'Share Buyback';
  if (/(secondary|equity|share|at.the.market|atm) offering|dilutive/i.test(text)) return 'Debt Offering';
  if (/layoff|job cut|restructur|reorgani|workforce reduction/i.test(text)) return 'Restructuring / Layoffs';
  if (/\bceo\b|\bcfo\b|\bcoo\b|appoints?|names? (new|a )|resign|steps? down|retir/i.test(text)) return 'Management Change';
  if (/launch|introduc|unveil|new product|new model|new service/i.test(text)) return 'Product Launch';
  return 'Unknown / Sector Move';
}

function buildCatalystDesc(type: CatalystType, symbol: string): string {
  const map: Record<CatalystType, string> = {
    'Earnings Beat':         `${symbol} beat analyst estimates on EPS and/or revenue — a strong fundamental catalyst. Institutions typically add to positions, creating sustained buying pressure for 1–3 sessions.`,
    'Earnings Miss':         `${symbol} missed earnings expectations — a negative fundamental catalyst. Expect sellers to dominate; look for dead-cat bounces to fade rather than buying the initial dip.`,
    'Earnings Report':       `${symbol} reported quarterly results. Compare actual EPS and revenue vs consensus estimates, plus any forward guidance changes, before taking a position.`,
    'FDA Approval':          `FDA approved a key drug or device for ${symbol} — one of the strongest positive catalysts in healthcare. These gaps frequently continue for 2–3 sessions on institutional buying.`,
    'FDA Rejection':         `FDA rejected or issued a complete response letter for ${symbol}. Expect sustained selling pressure; avoid catching the falling knife on day one.`,
    'FDA Catalyst':          `${symbol} has an active FDA-related event (trial data, PDUFA date, or advisory committee meeting) — a binary risk event with potentially explosive moves in either direction.`,
    'M&A / Acquisition':     `${symbol} is involved in a merger or acquisition. If it is the target, the gap toward the offer price is typically permanent. If it is the acquirer, watch for dilution-driven selling.`,
    'Partnership / Alliance':`${symbol} announced a strategic partnership, collaboration, or licensing agreement — validates the business model and often signals institutional interest in the sector.`,
    'Major Contract':        `${symbol} won or lost a major contract. Contract wins can drive multi-day runs; contract losses often pressure the stock for several sessions as estimates get revised down.`,
    'Analyst Upgrade':       `An analyst upgraded ${symbol} — a positive catalyst but weaker than earnings. The gap may partially fill; look for institutional follow-through before committing size.`,
    'Analyst Downgrade':     `An analyst downgraded ${symbol} — a negative catalyst. Gap-downs on downgrades often see partial fills as value buyers step in, creating fade-the-bounce opportunities.`,
    'Price Target Raise':    `One or more analysts raised their price target on ${symbol} — minor positive catalyst that reinforces the existing bullish thesis without changing the fundamental picture.`,
    'Stock Split':           `${symbol} announced a stock split — historically bullish as it increases retail accessibility and signals management confidence. The gap is typically sustained.`,
    'Share Buyback':         `${symbol} announced a share repurchase program — bullish signal indicating management believes the stock is undervalued. Creates a price floor at key support levels.`,
    'Debt Offering':         `${symbol} is conducting a share or debt offering — dilutive to existing holders. Gap-downs on offerings tend to continue for 1–2 sessions as supply hits the market.`,
    'Restructuring / Layoffs':`${symbol} announced restructuring or layoffs — initially bullish (cost-cutting narrative) but signals underlying business challenges. Watch the stock's reaction to the initial bounce.`,
    'Management Change':     `${symbol} has a key leadership change. New CEO appointments can be bullish if the incoming exec has a strong track record; unexpected departures are typically bearish.`,
    'Product Launch':        `${symbol} launched or unveiled a new product or service — a positive catalyst if the market validates the opportunity. Watch early commercial traction data.`,
    'Short Squeeze Setup':   `${symbol} has elevated short interest; a gap against short sellers could trigger a squeeze with explosive upside. These moves can be violent but also reverse just as quickly.`,
    'Unknown / Sector Move': `No specific fundamental catalyst identified for ${symbol}. The gap may reflect sector rotation, macro developments, or undisclosed news. Trade with extra caution and tighter stops.`,
  };
  return map[type] ?? '';
}

function formatAge(unixSec: number): string {
  if (!unixSec) return '';
  const diffMs  = Date.now() - unixSec * 1000;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60)  return `${diffMin}m ago`;
  const diffHr  = Math.floor(diffMin / 60);
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
  const abs = Math.abs(gapPct);

  const STRONG: CatalystType[] = ['Earnings Beat', 'FDA Approval', 'M&A / Acquisition', 'FDA Catalyst'];
  const WEAK:   CatalystType[] = ['Analyst Upgrade', 'Analyst Downgrade', 'Price Target Raise', 'Unknown / Sector Move'];
  const isStrong = STRONG.includes(catalystType);
  const isWeak   = WEAK.includes(catalystType);

  const highShortI  = shortInterestPct != null && shortInterestPct > 20;
  const smallFloat  = floatSharesM     != null && floatSharesM < 50;
  const highAvgVol  = avgVol > 5_000_000;

  // Extreme gap — ORB is safer (chasing is dangerous)
  if (abs >= 12) {
    return {
      strategy: 'Opening Range Breakout (ORB)',
      note: `${abs.toFixed(1)}% gap is extreme — chasing the open is dangerous. Let the first 15–30 min establish a range, then enter on a confirmed break of the high (long) or low (short) with above-average volume. Stop at the opposite end of the range. Target: 1–2× range size.`,
      riskLevel: 'Very High',
    };
  }

  // Short squeeze: high SI + gap up OR gap down reversal potential
  if (highShortI && gapDir === 'up' && abs >= 3) {
    return {
      strategy: 'Short Squeeze Watch',
      note: `Short interest of ${shortInterestPct?.toFixed(1)}% creates squeeze potential. Buy pullback to the 5-min low or VWAP after open with tight stop (1× ATR = $${atr.toFixed(2)}). Exits must be planned in advance — squeezes can reverse instantly. Target: $${(price * 1.05).toFixed(2)}–$${(price * 1.10).toFixed(2)}.`,
      riskLevel: 'Very High',
    };
  }

  // Strong catalyst + gap ≥ 5% = Gap and Go
  if (abs >= 5 && isStrong && gapDir === 'up') {
    return {
      strategy: 'Gap and Go',
      note: `Strong catalyst + ${abs.toFixed(1)}% gap-up. Wait for the opening bell; if the first 5-min candle is green and closes near its high, buy the break of that candle's high. Stop: below the 5-min candle low or pre-market low. Target: $${resistance.toFixed(2)} (resistance) or a measured move equal to the gap size.`,
      riskLevel: 'High',
    };
  }

  // Strong catalyst + gap down = Momentum short continuation
  if (abs >= 5 && isStrong && gapDir === 'down') {
    return {
      strategy: 'Momentum Continuation',
      note: `Strong negative catalyst + ${abs.toFixed(1)}% gap-down. Short the first dead-cat bounce (VWAP rejection or 5-min candle break). Stop: above pre-market high. Targets: $${support.toFixed(2)} (support), then a 50–100% gap fill. Do NOT bottom-fish until sellers are clearly exhausted.`,
      riskLevel: 'High',
    };
  }

  // Small float + gap = explosive momentum, tight stops
  if (smallFloat && abs >= 4) {
    return {
      strategy: 'Momentum Continuation',
      note: `Small float (${floatSharesM?.toFixed(1)}M shares) + ${abs.toFixed(1)}% gap = high squeeze/momentum potential. Buy the break of the first 1-min candle high with volume. ATR = $${atr.toFixed(2)} — size accordingly (risk ≤ 1% account). Small floats can reverse violently: use a hard stop and have exit plan ready.`,
      riskLevel: 'Very High',
    };
  }

  // Weak catalyst, small gap = high fill probability
  if (abs < 4 && isWeak) {
    return {
      strategy: 'Gap Fill / Reversal',
      note: `Small ${abs.toFixed(1)}% gap on a ${catalystType.toLowerCase()} — ~70% of gaps under 4% fill the same day. ${gapDir === 'up' ? `Short the opening pop if price rejects VWAP or the pre-market high. Target: previous close $${price.toFixed(2)} → $${(price - Math.abs(price * gapPct / 100)).toFixed(2)}.` : `Buy if price finds support at VWAP or yesterday's close. Target: partial gap fill to $${(price + Math.abs(price * gapPct / 100) * 0.5).toFixed(2)}.`}`,
      riskLevel: 'Medium',
    };
  }

  // Fade opportunity: weak catalyst on a high-volume liquid stock
  if (isWeak && gapDir === 'up' && highAvgVol && abs >= 3) {
    return {
      strategy: 'Fade the Gap (Short)',
      note: `Weak catalyst (${catalystType}) on a high-liquidity stock — institutional sellers likely. Short the peak of the opening pop (first 2–3 min) with stop above the pre-market high ($${resistance.toFixed(2)}). Target: VWAP, then 50% of the gap. Works best when the broad market is flat or weak at open.`,
      riskLevel: 'High',
    };
  }

  // Default: VWAP Reclaim — lower risk confirmation entry
  return {
    strategy: 'VWAP Reclaim',
    note: `Wait for the post-open pullback to VWAP; enter when price reclaims VWAP with volume ≥ 2× the prior candle's volume. Stop: close below VWAP (risk ≈ $${(atr * 0.3).toFixed(2)}). Targets: $${(price + atr).toFixed(2)} (+1 ATR), then $${resistance.toFixed(2)} (resistance). This reduces risk vs chasing the open.`,
    riskLevel: 'Medium',
  };
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export async function runGappersScanner(): Promise<{ preMarket: GapperResult[]; intraday: GapperResult[] }> {
  await ensureYFSession();

  const preMarket: GapperResult[] = [];
  const intraday:  GapperResult[] = [];

  // ── Pass 1: quick quote scan ───────────────────────────────────────────────
  for (const stock of GAPPERS_UNIVERSE) {
    await sleep(DELAY_MS);

    const q = await fetchQuoteData(stock.symbol);
    if (!q) continue;

    // Filters: ATR ≥ $0.50 and avg daily vol > 500K
    if (q.atr < 0.50)           continue;
    if (q.avgDailyVolume < 500_000) continue;
    // Volume filter: ≥ 50K today
    if (q.regularMarketVolume < 50_000) continue;

    // Pre-market gap:
    //   • During pre-market hours (4–9:30 AM ET): preMarketPrice is live
    //   • During/after market hours: preMarketPrice is null — fall back to
    //     today's opening candle price, which IS the gap that occurred at open
    const pmPrice = q.preMarketPrice ?? q.todayOpenPrice;
    if (pmPrice != null && q.prevClose > 0) {
      const pmGapPct = ((pmPrice - q.prevClose) / q.prevClose) * 100;
      if (Math.abs(pmGapPct) >= 2) {
        preMarket.push(buildPlaceholder(stock, 'pre-market', pmPrice, q.prevClose, pmGapPct, q));
      }
    }

    // Intraday gap — live current price vs previous close
    if (q.prevClose > 0) {
      const idGapPct = ((q.regularMarketPrice - q.prevClose) / q.prevClose) * 100;
      if (Math.abs(idGapPct) >= 2) {
        intraday.push(buildPlaceholder(stock, 'intraday', q.regularMarketPrice, q.prevClose, idGapPct, q));
      }
    }
  }

  // ── Pass 2: enrich with SI, float, news ───────────────────────────────────
  const seen = new Set<string>();
  const allCandidates = [...preMarket, ...intraday];

  for (const g of allCandidates) {
    if (seen.has(g.symbol)) continue;
    seen.add(g.symbol);

    await sleep(DELAY_MS);
    const { floatSharesM, shortInterestPct } = await fetchFloatAndSI(g.symbol);

    // Filter: short interest ≤ 30%
    if (shortInterestPct != null && shortInterestPct > 30) {
      removeFromBoth(g.symbol, preMarket, intraday);
      continue;
    }

    await sleep(DELAY_MS);
    const news = await fetchNews(g.symbol);

    // Apply enrichment to both arrays
    for (const arr of [preMarket, intraday]) {
      const idx = arr.findIndex(x => x.symbol === g.symbol);
      if (idx === -1) continue;
      const row = arr[idx];

      row.floatSharesM    = floatSharesM;
      row.shortInterestPct = shortInterestPct;
      Object.assign(row, news);

      const { strategy, note, riskLevel } = selectStrategy(
        row.price, row.gapPct, row.gapDirection, row.catalystType,
        row.avgDailyVolume, row.shortInterestPct, row.atr, row.floatSharesM,
        row.resistance, row.support,
      );
      row.suggestedStrategy = strategy;
      row.strategyNote      = note;
      row.riskLevel         = riskLevel;
    }
  }

  // Sort by absolute gap % descending
  preMarket.sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct));
  intraday.sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct));

  return { preMarket, intraday };
}

function buildPlaceholder(
  stock: UniverseStock,
  gapType: GapType,
  price: number,
  prevClose: number,
  gapPct: number,
  q: QuoteData,
): GapperResult {
  return {
    symbol: stock.symbol,
    name: q.name || stock.name,
    sector: stock.sector,
    gapType,
    gapDirection: gapPct > 0 ? 'up' : 'down',
    price,
    prevClose,
    gapPct,
    volumeToday: q.regularMarketVolume,
    avgDailyVolume: q.avgDailyVolume,
    volRatio: q.avgDailyVolume > 0 ? q.regularMarketVolume / q.avgDailyVolume : 0,
    atr: q.atr,
    floatSharesM: null,
    shortInterestPct: null,
    support: q.support,
    resistance: q.resistance,
    catalystType: 'Unknown / Sector Move',
    fundamentalCatalyst: '',
    newsHeadline: '',
    newsUrl: `https://finance.yahoo.com/quote/${stock.symbol}`,
    newsSource: '',
    newsAge: '',
    suggestedStrategy: 'VWAP Reclaim',
    strategyNote: '',
    riskLevel: 'High',
  };
}

function removeFromBoth(symbol: string, ...arrays: GapperResult[][]): void {
  for (const arr of arrays) {
    const idx = arr.findIndex(g => g.symbol === symbol);
    if (idx !== -1) arr.splice(idx, 1);
  }
}
