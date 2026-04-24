import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooCandles } from '@/lib/yahoofetch';
import { runBacktest } from '@/lib/backtest';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase().trim();
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  try {
    const candles = await fetchYahooCandles(symbol);

    if (candles.length < 220) {
      return NextResponse.json(
        { error: `Not enough historical data for ${symbol}. Need at least 220 daily candles.` },
        { status: 422 },
      );
    }

    const result = runBacktest(symbol, candles);

    if (!result) {
      return NextResponse.json(
        { error: `No trades generated for ${symbol}. Try a different stock.` },
        { status: 422 },
      );
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
