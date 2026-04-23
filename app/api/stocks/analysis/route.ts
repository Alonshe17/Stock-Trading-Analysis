import { NextRequest, NextResponse } from 'next/server';
import { getCandles, getProfile, getFinancials } from '@/lib/finnhub';
import { analyze, calcMarketRegime } from '@/lib/analysis';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  try {
    const sym = symbol.toUpperCase();
    const [candles, spyCandles, financials, profile] = await Promise.all([
      getCandles(sym, 'D'),
      getCandles('SPY', 'D'),
      getFinancials(sym).catch(() => null),
      getProfile(sym).catch(() => null),
    ]);

    const marketRegime = calcMarketRegime(spyCandles);
    const result = analyze(sym, candles, marketRegime);

    // Merge fundamentals from Finnhub (P/E TTM, dividend yield, market cap)
    if (financials) {
      if (financials.peTTM !== null)        result.peRatio  = financials.peTTM;
      if (financials.dividendYield !== null) result.dividend = financials.dividendYield;
    }
    // Market cap comes from the profile endpoint (already in millions USD)
    if (profile?.marketCap) result.marketCap = profile.marketCap;

    // Extra fundamental fields for watchlist health badge
    const extra = {
      revenueGrowth:  financials?.revenueGrowthYoy != null ? financials.revenueGrowthYoy / 100 : null,
      profitMargin:   financials?.netMargin        != null ? financials.netMargin        / 100 : null,
      analystRating:  financials?.recommendation   ?? null,
      analystBuy:     financials?.analystBuy  ?? 0,
      analystHold:    financials?.analystHold ?? 0,
      analystSell:    financials?.analystSell ?? 0,
    };

    return NextResponse.json({ ...result, marketRegime, name: profile?.name ?? sym, ...extra });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
