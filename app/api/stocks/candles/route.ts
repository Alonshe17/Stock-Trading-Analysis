import { NextRequest, NextResponse } from 'next/server';
import { getCandles, type Resolution } from '@/lib/finnhub';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get('symbol');
  const resolution = (searchParams.get('resolution') ?? 'D') as Resolution;

  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  try {
    const candles = await getCandles(symbol.toUpperCase(), resolution);
    return NextResponse.json({ candles });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
