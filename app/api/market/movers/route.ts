import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 20;
export const dynamic = 'force-dynamic';

export type Mover = {
  symbol:     string;
  name:       string;
  price:      number;
  change:     number;
  changePct:  number;
  volume:     number;
  avgVolume:  number;
  marketCapM: number;
};

const SCREENER_IDS: Record<string, string> = {
  gainers: 'day_gainers',
  losers:  'day_losers',
  actives: 'most_actives',
};

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

async function getYFCrumb(): Promise<{ crumb: string; cookie: string }> {
  const r = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { ...YF_HEADERS, 'Accept': '*/*' },
    cache: 'no-store',
  });
  const crumb = (await r.text()).trim();
  const rawCookie = r.headers.get('set-cookie') ?? '';
  const cookie = rawCookie.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  return { crumb, cookie };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuote(q: any): Mover {
  return {
    symbol:     String(q.symbol    ?? ''),
    name:       String(q.shortName ?? q.longName ?? q.symbol ?? ''),
    price:      Number(q.regularMarketPrice         ?? 0),
    change:     Number(q.regularMarketChange        ?? 0),
    changePct:  Number(q.regularMarketChangePercent ?? 0),
    volume:     Number(q.regularMarketVolume        ?? 0),
    avgVolume:  Number(q.averageDailyVolume3Month    ?? q.averageDailyVolume10Day ?? 0),
    marketCapM: q.marketCap ? Math.round(Number(q.marketCap) / 1_000_000) : 0,
  };
}

// Trending uses a separate endpoint that returns only symbols — then we bulk-fetch quotes.
async function fetchTrending(crumb: string, cookie: string): Promise<Mover[]> {
  const trendRes = await fetch(
    `https://query1.finance.yahoo.com/v1/finance/trending/US?count=25&crumb=${encodeURIComponent(crumb)}`,
    { headers: { ...YF_HEADERS, Cookie: cookie }, cache: 'no-store' },
  );
  if (!trendRes.ok) throw new Error(`Yahoo Finance trending ${trendRes.status}`);

  const trendJson = await trendRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const symbols: string[] = (trendJson?.finance?.result?.[0]?.quotes ?? []).map((q: any) => q.symbol).filter(Boolean);
  if (symbols.length === 0) return [];

  // Bulk-fetch full quote data for those symbols
  const quoteRes = await fetch(
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}&crumb=${encodeURIComponent(crumb)}`,
    { headers: { ...YF_HEADERS, Cookie: cookie }, cache: 'no-store' },
  );
  if (!quoteRes.ok) throw new Error(`Yahoo Finance quote ${quoteRes.status}`);

  const quoteJson = await quoteRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotes: any[] = quoteJson?.quoteResponse?.result ?? [];
  return quotes.map(mapQuote);
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? 'gainers';

  try {
    const { crumb, cookie } = await getYFCrumb();

    // Trending tickers use a different API path
    if (type === 'trending') {
      return NextResponse.json(await fetchTrending(crumb, cookie));
    }

    const scrId = SCREENER_IDS[type] ?? 'day_gainers';
    const url =
      `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved` +
      `?formatted=false&lang=en-US&region=US&scrIds=${scrId}&count=25` +
      `&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetch(url, { headers: { ...YF_HEADERS, Cookie: cookie }, cache: 'no-store' });
    if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`);

    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotes: any[] = json?.finance?.result?.[0]?.quotes ?? [];
    return NextResponse.json(quotes.map(mapQuote));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
