import type { Candle } from './finnhub';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

// Convert symbol to Yahoo Finance format for chart API
// Yahoo chart API accepts dots (7203.T), only BRK.B needs → BRK-B
function toYahooChartSymbol(symbol: string): string {
  if (symbol === 'BRK.B') return 'BRK-B';
  return symbol;
}

// Convert symbol to Yahoo Finance format for quoteSummary API
// quoteSummary also accepts dots; only BRK.B → BRK-B conversion needed
function toYahooSummarySymbol(symbol: string): string {
  if (symbol === 'BRK.B') return 'BRK-B';
  return symbol;
}

/**
 * Fetch daily OHLCV candles for any Yahoo Finance symbol globally.
 * Works for US, Japanese, HK, Korean, Australian, Indian, European stocks.
 */
export async function fetchYahooCandles(symbol: string): Promise<Candle[]> {
  const yfSymbol = toYahooChartSymbol(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1d&range=2y`;

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

export interface YahooFundamentals {
  name: string;
  sector: string;
  industry: string;
  currency: string;
  price: number;
  marketCap: number;
  peRatio: number | null;
  forwardPE: number | null;
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  numberOfAnalysts: number;
  analystRating: string | null; // "Strong Buy" | "Buy" | "Hold" | "Underperform" | "Sell"
  revenueGrowth: number | null; // YoY decimal e.g. 0.32 = 32%
  earningsGrowth: number | null;
  profitMargin: number | null;
}

function mapAnalystRating(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const map: Record<string, string> = {
    strong_buy:    'Strong Buy',
    strongbuy:     'Strong Buy',
    buy:           'Buy',
    hold:          'Hold',
    underperform:  'Underperform',
    sell:          'Sell',
  };
  return map[raw.toLowerCase().replace(/[\s_-]/g, '')] ?? raw;
}

/**
 * Fetch fundamentals from Yahoo Finance quoteSummary v10.
 * modules: financialData, summaryProfile, summaryDetail, quoteType
 */
export async function fetchYahooFundamentals(symbol: string): Promise<YahooFundamentals | null> {
  const yfSymbol = toYahooSummarySymbol(symbol);
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yfSymbol)}?modules=financialData,summaryProfile,summaryDetail,quoteType`;

  try {
    const res = await fetch(url, { headers: YF_HEADERS, cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const summary = data?.quoteSummary?.result?.[0];
    if (!summary) return null;

    const fd = summary.financialData ?? {};
    const sp = summary.summaryProfile ?? {};
    const sd = summary.summaryDetail ?? {};
    const qt = summary.quoteType ?? {};

    // Yahoo returns numeric fields as { raw: number, fmt: string }; use .raw
    function raw(obj: Record<string, unknown> | null | undefined, key: string): number | null {
      if (!obj) return null;
      const val = obj[key];
      if (val === null || val === undefined) return null;
      if (typeof val === 'object' && val !== null && 'raw' in val) {
        const r = (val as { raw: unknown }).raw;
        return typeof r === 'number' ? r : null;
      }
      return typeof val === 'number' ? val : null;
    }

    const price = raw(fd, 'currentPrice') ?? raw(sd, 'regularMarketPrice') ?? 0;
    const marketCap = raw(sd, 'marketCap') ?? 0;
    const peRatio = raw(sd, 'trailingPE') ?? raw(fd, 'trailingPE');
    const forwardPE = raw(sd, 'forwardPE') ?? raw(fd, 'forwardPE');
    const targetMeanPrice = raw(fd, 'targetMeanPrice');
    const targetHighPrice = raw(fd, 'targetHighPrice');
    const targetLowPrice = raw(fd, 'targetLowPrice');
    const numberOfAnalysts = (raw(fd, 'numberOfAnalystOpinions') ?? 0) as number;
    const analystRatingRaw = fd.recommendationKey as string | null | undefined;
    const analystRating = mapAnalystRating(analystRatingRaw);
    const revenueGrowth = raw(fd, 'revenueGrowth');
    const earningsGrowth = raw(fd, 'earningsGrowth');
    const profitMargin = raw(fd, 'profitMargins');

    const name = (qt.longName as string) || (qt.shortName as string) || symbol;
    const sector = (sp.sector as string) || '';
    const industry = (sp.industry as string) || '';
    const currency = (qt.currency as string) || (sd.currency as string) || 'USD';

    return {
      name,
      sector,
      industry,
      currency,
      price,
      marketCap,
      peRatio,
      forwardPE,
      targetMeanPrice,
      targetHighPrice,
      targetLowPrice,
      numberOfAnalysts: Math.round(numberOfAnalysts),
      analystRating,
      revenueGrowth,
      earningsGrowth,
      profitMargin,
    };
  } catch {
    return null;
  }
}
