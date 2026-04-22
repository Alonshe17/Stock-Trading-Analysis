import { NextRequest, NextResponse } from 'next/server';
import { getUpcomingEarnings } from '@/lib/finnhub';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get('symbol');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!symbol || !from || !to) return NextResponse.json({ date: null });

  try {
    const events = await getUpcomingEarnings(from, to);
    const match = events.find((e) => e.symbol === symbol.toUpperCase());
    return NextResponse.json({ date: match?.date ?? null });
  } catch {
    return NextResponse.json({ date: null });
  }
}
