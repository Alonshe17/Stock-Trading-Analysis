import { NextResponse } from 'next/server';
import { getCandles } from '@/lib/finnhub';
import { calcMarketRegime } from '@/lib/analysis';
import { runScreener } from '@/lib/screener';

export const maxDuration = 60;

export async function GET() {
  try {
    const spyCandles = await getCandles('SPY', 'D');
    const marketRegime = calcMarketRegime(spyCandles);
    const results = await runScreener(marketRegime, 25);
    return NextResponse.json({ marketRegime, results, updatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
