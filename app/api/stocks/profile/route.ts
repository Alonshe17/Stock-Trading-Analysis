import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/finnhub';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  try {
    const profile = await getProfile(symbol.toUpperCase());
    if (!profile) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
