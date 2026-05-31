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

const SCREENER_IDS = {
  gainers:  'day_gainers',
  losers:   'day_losers',
  actives:  'most_actives',
  trending: 'trending_tickers',
} as const;

type ScreenerKey = keyof typeof SCREENER_IDS;

async function getYFCrumb(): Promise<{ crumb: string; cookie: string }> {
  const r = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
    },
    cache: 'no-store',
  });
  const crumb = (await r.text()).trim();
  const rawCookie = r.headers.get('set-cookie') ?? '';
  const cookie = rawCookie.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  return { crumb, cookie };
}

export async function GET(req: NextRequest) {
  const type   = (req.nextUrl.searchParams.get('type') ?? 'gainers') as ScreenerKey;
  const scrId  = SCREENER_IDS[type] ?? 'day_gainers';

  try {
    const { crumb, cookie } = await getYFCrumb();

    const url =
      `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved` +
      `?formatted=false&lang=en-US&region=US&scrIds=${scrId}&count=25` +
      `&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Cookie': cookie,
      },
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`);

    const json   = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotes: any[] = json?.finance?.result?.[0]?.quotes ?? [];

    const movers: Mover[] = quotes.map(q => ({
      symbol:     String(q.symbol   ?? ''),
      name:       String(q.shortName ?? q.longName ?? q.symbol ?? ''),
      price:      Number(q.regularMarketPrice         ?? 0),
      change:     Number(q.regularMarketChange        ?? 0),
      changePct:  Number(q.regularMarketChangePercent ?? 0),
      volume:     Number(q.regularMarketVolume        ?? 0),
      avgVolume:  Number(q.averageDailyVolume3Month    ?? q.averageDailyVolume10Day ?? 0),
      marketCapM: q.marketCap ? Math.round(Number(q.marketCap) / 1_000_000) : 0,
    }));

    return NextResponse.json(movers);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
