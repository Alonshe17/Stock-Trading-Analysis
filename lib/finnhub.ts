const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Yahoo Finance needs a browser-like User-Agent to avoid 429s
const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

function getFinnhubKey(): string | null {
  return process.env.FINNHUB_API_KEY ?? null;
}

// Yahoo Finance chart API accepts exchange suffixes with dots (STAN.L, SAP.DE, 7203.T).
// Only US share-class dots need converting: BRK.B → BRK-B, BF.B → BF-B.
function toYahooSymbol(symbol: string): string {
  if (symbol === 'BRK.B') return 'BRK-B';
  if (symbol === 'BF.B')  return 'BF-B';
  return symbol;
}

export type Candle = {
  t: number; // unix timestamp
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type Resolution = 'D' | '15' | '60' | 'W';

// Yahoo Finance interval mapping
const INTERVAL_MAP: Record<Resolution, string> = {
  D: '1d',
  '15': '15m',
  '60': '1h',
  W: '1wk',
};

// Range to fetch per resolution
const RANGE_MAP: Record<Resolution, string> = {
  D: '2y',   // 2 years of daily data — enough for EMA 200 warmup
  '15': '1mo', // 1 month of 15-min candles (Yahoo free limit)
  '60': '6mo',
  W: '5y',
};

export async function getCandles(
  symbol: string,
  resolution: Resolution,
  _from?: number,
  _to?: number,
): Promise<Candle[]> {
  const yfSymbol = toYahooSymbol(symbol);
  const interval = INTERVAL_MAP[resolution];
  const range = RANGE_MAP[resolution];
  const url = `${YAHOO_BASE}/${yfSymbol}?interval=${interval}&range=${range}`;

  try {
    const res = await fetch(url, { headers: YF_HEADERS, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const opens: number[] = quote.open ?? [];
    const highs: number[] = quote.high ?? [];
    const lows: number[] = quote.low ?? [];
    const closes: number[] = quote.close ?? [];
    const volumes: number[] = quote.volume ?? [];

    return timestamps
      .map((t, i) => ({
        t,
        o: opens[i],
        h: highs[i],
        l: lows[i],
        c: closes[i],
        v: volumes[i] ?? 0,
      }))
      .filter((c) => c.o != null && c.h != null && c.l != null && c.c != null);
  } catch {
    return [];
  }
}

export type StockProfile = {
  symbol: string;
  name: string;
  marketCap: number;
  sector: string;
  exchange: string;
  isEtf: boolean;
};

export async function getProfile(symbol: string, delayMs = 0): Promise<StockProfile | null> {
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  const key = getFinnhubKey();
  if (!key) return null;
  const url = `${FINNHUB_BASE}/stock/profile2?symbol=${symbol}&token=${key}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.name) return null;
    return {
      symbol,
      name: d.name,
      marketCap: d.marketCapitalization ?? 0,
      sector: d.finnhubIndustry ?? '',
      exchange: d.exchange ?? '',
      isEtf: (d.type ?? '').toLowerCase() === 'etf',
    };
  } catch {
    return null;
  }
}

export type EarningsEvent = {
  symbol: string;
  date: string;
};

export async function getUpcomingEarnings(from: string, to: string): Promise<EarningsEvent[]> {
  const key = getFinnhubKey();
  if (!key) return [];
  const url = `${FINNHUB_BASE}/calendar/earnings?from=${from}&to=${to}&token=${key}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.earningsCalendar ?? []).map((e: { symbol: string; date: string }) => ({
      symbol: e.symbol,
      date: e.date,
    }));
  } catch {
    return [];
  }
}

export async function getQuote(symbol: string): Promise<{ c: number; pc: number } | null> {
  const key = getFinnhubKey();
  if (!key) return null;
  const url = `${FINNHUB_BASE}/quote?symbol=${symbol}&token=${key}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const d = await res.json();
    return { c: d.c, pc: d.pc };
  } catch {
    return null;
  }
}

export type NewsItem = {
  id: number;
  datetime: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  category: string;
};

export async function getCompanyNews(symbol: string, days = 7): Promise<NewsItem[]> {
  const key = getFinnhubKey();
  if (!key) return [];
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const url = `${FINNHUB_BASE}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${key}`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } }); // cache 30 min
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.slice(0, 15) : [];
  } catch {
    return [];
  }
}

export type QuoteFundamentals = {
  open: number;
  high: number;
  low: number;
  week52High: number;
  week52Low: number;
  peRatio: number;
  marketCap: number;  // in millions USD
  dividend: number;   // annual dividend per share
};

export async function getQuoteFundamentals(symbol: string): Promise<QuoteFundamentals | null> {
  const yfSymbol = toYahooSymbol(symbol);
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yfSymbol}&fields=regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,fiftyTwoWeekHigh,fiftyTwoWeekLow,trailingPE,marketCap,trailingAnnualDividendRate`;
  try {
    const res = await fetch(url, { headers: YF_HEADERS, cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const q = data?.quoteResponse?.result?.[0];
    if (!q) return null;
    return {
      open: q.regularMarketOpen ?? 0,
      high: q.regularMarketDayHigh ?? 0,
      low: q.regularMarketDayLow ?? 0,
      week52High: q.fiftyTwoWeekHigh ?? 0,
      week52Low: q.fiftyTwoWeekLow ?? 0,
      peRatio: q.trailingPE ?? 0,
      marketCap: q.marketCap ? q.marketCap / 1_000_000 : 0,
      dividend: q.trailingAnnualDividendRate ?? 0,
    };
  } catch {
    return null;
  }
}

export type Financials = {
  // Valuation
  peTTM: number | null;
  pfcfTTM: number | null;         // Price / Free Cash Flow
  evRevenueTTM: number | null;    // EV / Revenue
  eps: number | null;             // EPS TTM
  dividendYield: number | null;   // %
  // Profitability (all TTM %)
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roeTTM: number | null;
  roaTTM: number | null;
  // Growth
  revenueGrowthYoy: number | null; // TTM YoY %
  revenueGrowth3Y: number | null;  // 3Y CAGR %
  revenueGrowth5Y: number | null;  // 5Y CAGR %
  // Leverage
  debtToEquity: number | null;     // total D/E ratio
  ltDebtToEquity: number | null;   // long-term D/E
  currentRatio: number | null;
  // Cash flow
  cashFlowPerShare: number | null;
  // Analyst consensus from Finnhub /stock/recommendation (free tier)
  analystBuy: number;
  analystHold: number;
  analystSell: number;
  recommendation: string | null;
  // NOTE: price targets (/stock/price-target) require Finnhub paid tier
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function metricNum(m: Record<string, unknown>, key: string): number | null {
  const v = m[key];
  return typeof v === 'number' && isFinite(v) ? v : null;
}

export async function getFinancials(symbol: string): Promise<Financials | null> {
  const key = getFinnhubKey();
  if (!key) return null;

  try {
    // Fetch metrics + analyst recommendations in parallel
    // NOTE: /stock/price-target requires Finnhub paid tier — not fetched here
    const [metricRes, recRes] = await Promise.all([
      fetch(`${FINNHUB_BASE}/stock/metric?symbol=${symbol}&metric=all&token=${key}`, { next: { revalidate: 3600 } }),
      fetch(`${FINNHUB_BASE}/stock/recommendation?symbol=${symbol}&token=${key}`, { next: { revalidate: 3600 } }),
    ]);

    if (!metricRes.ok) return null;
    const metricData = await metricRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: Record<string, any> = metricData?.metric ?? {};

    // Analyst recommendations — use the most recent period
    let analystBuy = 0, analystHold = 0, analystSell = 0, recommendation: string | null = null;
    if (recRes.ok) {
      const recData = await recRes.json();
      if (Array.isArray(recData) && recData.length > 0) {
        const latest = recData[0];
        analystBuy  = (latest.strongBuy ?? 0) + (latest.buy ?? 0);
        analystHold = latest.hold ?? 0;
        analystSell = (latest.sell ?? 0) + (latest.strongSell ?? 0);
        const total = analystBuy + analystHold + analystSell;
        if (total > 0) {
          const buyPct = analystBuy / total;
          const sellPct = analystSell / total;
          if (buyPct >= 0.6)       recommendation = 'Strong Buy';
          else if (buyPct >= 0.4)  recommendation = 'Buy';
          else if (sellPct >= 0.4) recommendation = 'Sell';
          else                     recommendation = 'Hold';
        }
      }
    }

    return {
      peTTM:            metricNum(m, 'peTTM'),
      pfcfTTM:          metricNum(m, 'pfcfShareTTM'),
      evRevenueTTM:     metricNum(m, 'evRevenueTTM'),
      eps:              metricNum(m, 'epsBasicExclExtraItemsTTM'),
      dividendYield:    metricNum(m, 'dividendYieldIndicatedAnnual'),
      grossMargin:      metricNum(m, 'grossMarginTTM'),
      operatingMargin:  metricNum(m, 'operatingMarginTTM'),
      netMargin:        metricNum(m, 'netProfitMarginTTM'),
      roeTTM:           metricNum(m, 'roeTTM'),
      roaTTM:           metricNum(m, 'roaTTM'),
      revenueGrowthYoy: metricNum(m, 'revenueGrowthTTMYoy'),
      revenueGrowth3Y:  metricNum(m, 'revenueGrowth3Y'),
      revenueGrowth5Y:  metricNum(m, 'revenueGrowth5Y'),
      debtToEquity:     metricNum(m, 'totalDebt/totalEquityAnnual'),
      ltDebtToEquity:   metricNum(m, 'longTermDebt/equityAnnual'),
      currentRatio:     metricNum(m, 'currentRatioAnnual'),
      cashFlowPerShare: metricNum(m, 'cashFlowPerShareTTM'),
      analystBuy,
      analystHold,
      analystSell,
      recommendation,
    };
  } catch {
    return null;
  }
}

export async function getMarketNews(category: 'general' | 'forex' | 'crypto' = 'general'): Promise<NewsItem[]> {
  const key = getFinnhubKey();
  if (!key) return [];
  const url = `${FINNHUB_BASE}/news?category=${category}&token=${key}`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.slice(0, 8) : [];
  } catch {
    return [];
  }
}
