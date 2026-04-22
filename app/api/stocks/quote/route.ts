import { NextRequest, NextResponse } from 'next/server';

// Uses Yahoo Finance for real-time quote — no API key needed
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return NextResponse.json({ error: 'no data' }, { status: 404 });
    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      price: meta.regularMarketPrice ?? 0,
      prevClose: meta.previousClose ?? meta.chartPreviousClose ?? 0,
      high: meta.regularMarketDayHigh ?? 0,
      low: meta.regularMarketDayLow ?? 0,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
