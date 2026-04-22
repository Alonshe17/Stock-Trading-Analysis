import { NextRequest, NextResponse } from 'next/server';
import { getCandles, getProfile, getQuoteFundamentals } from '@/lib/finnhub';
import { analyze, calcMarketRegime } from '@/lib/analysis';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  try {
    const sym = symbol.toUpperCase();
    const [candles, spyCandles, fundamentals, profile] = await Promise.all([
      getCandles(sym, 'D'),
      getCandles('SPY', 'D'),
      getQuoteFundamentals(sym).catch(() => null),
      getProfile(sym).catch(() => null),
    ]);

    const marketRegime = calcMarketRegime(spyCandles);
    const result = analyze(sym, candles, marketRegime);

    // Merge fundamentals (PE, dividend, market cap) from Yahoo Finance
    if (fundamentals) {
      result.peRatio = fundamentals.peRatio;
      result.dividend = fundamentals.dividend;
      result.marketCap = fundamentals.marketCap;
      // Use Yahoo's live open/high/low if available (more accurate than last candle)
      if (fundamentals.open > 0) result.open = fundamentals.open;
      if (fundamentals.high > 0) result.high = fundamentals.high;
      if (fundamentals.low > 0) result.low = fundamentals.low;
      // Use Yahoo's 52wk high/low if available
      if (fundamentals.week52High > 0) result.week52High = fundamentals.week52High;
      if (fundamentals.week52Low > 0) result.week52Low = fundamentals.week52Low;
    }

    return NextResponse.json({ ...result, marketRegime, name: profile?.name ?? sym });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
