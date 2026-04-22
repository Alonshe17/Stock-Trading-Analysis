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

// Yahoo Finance uses dashes instead of dots (BRK.B → BRK-B)
function toYahooSymbol(symbol: string): string {
  return symbol.replace('.', '-');
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
    return Array.isArray(data) ? data.slice(0, 10) : [];
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
