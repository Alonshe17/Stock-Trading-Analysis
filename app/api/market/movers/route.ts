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

// query1 headers (with auth)
const Q1_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

// query2 headers (no auth needed)
const Q2_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

async function getYFCrumb(): Promise<{ crumb: string; cookie: string }> {
  const r = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { ...Q1_HEADERS, 'Accept': '*/*' },
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

// ── Trending ──────────────────────────────────────────────────────────────────
async function fetchTrending(): Promise<Mover[]> {
  // Step 1: get trending symbol list — works without auth
  const trendRes = await fetch(
    'https://query1.finance.yahoo.com/v1/finance/trending/US?count=25&lang=en-US&region=US',
    { headers: Q1_HEADERS, cache: 'no-store' },
  );
  if (!trendRes.ok) throw new Error(`Trending list failed (${trendRes.status})`);

  const trendJson = await trendRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = trendJson?.finance?.result?.[0]?.quotes ?? [];

  // Keep only plain equity symbols (filter out ^GSPC, BTC-USD, EURUSD=X …)
  const symbols: string[] = raw
    .map((q: { symbol?: string }) => q.symbol ?? '')
    .filter(s => s && !s.startsWith('^') && !s.includes('=') && !s.includes('-'))
    .slice(0, 15);

  if (symbols.length === 0) return [];

  // Step 2: v8/finance/chart works without any crumb/cookie auth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settled = await Promise.allSettled<any>(
    symbols.map(sym =>
      fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}` +
        `?interval=1d&range=1d&includePrePost=false`,
        { headers: Q1_HEADERS, cache: 'no-store' },
      ).then(r => (r.ok ? r.json() : Promise.reject(new Error(`${sym}: ${r.status}`)))),
    ),
  );

  const movers: Mover[] = [];
  for (let i = 0; i < symbols.length; i++) {
    const result = settled[i];
    if (result.status !== 'fulfilled') continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta: any = result.value?.chart?.result?.[0]?.meta;
    if (!meta) continue;
    const price = Number(meta.regularMarketPrice ?? 0);
    const prev  = Number(meta.chartPreviousClose ?? meta.previousClose ?? 0);
    if (price <= 0) continue;
    const change    = prev > 0 ? price - prev : 0;
    const changePct = prev > 0 ? (change / prev) * 100 : 0;
    movers.push({
      symbol:     symbols[i],
      name:       String(meta.longName ?? meta.shortName ?? symbols[i]),
      price,
      change,
      changePct,
      volume:     Number(meta.regularMarketVolume ?? 0),
      avgVolume:  Number(meta.regularMarketVolume ?? 0),
      marketCapM: 0,
    });
  }
  return movers;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? 'gainers';

  try {
    // Trending has its own crumb fetch inside fetchTrending()
    if (type === 'trending') {
      return NextResponse.json(await fetchTrending());
    }

    const { crumb, cookie } = await getYFCrumb();
    const scrId = SCREENER_IDS[type] ?? 'day_gainers';

    const url =
      `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved` +
      `?formatted=false&lang=en-US&region=US&scrIds=${scrId}&count=25` +
      `&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetch(url, {
      headers: { ...Q1_HEADERS, Cookie: cookie },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Screener fetch failed (${res.status})`);

    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotes: any[] = json?.finance?.result?.[0]?.quotes ?? [];
    return NextResponse.json(quotes.map(mapQuote));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
