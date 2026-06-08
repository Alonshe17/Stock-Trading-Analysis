import { NextRequest, NextResponse } from 'next/server';
import { getCandles, getProfile, getFinancials } from '@/lib/finnhub';
import { fetchYahooFundamentals } from '@/lib/yahoofetch';
import { analyze, calcMarketRegime } from '@/lib/analysis';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  try {
    const sym = symbol.toUpperCase();
    const [candles, spyCandles, financials, profile, yf] = await Promise.all([
      getCandles(sym, 'D'),
      getCandles('SPY', 'D'),
      getFinancials(sym).catch(() => null),
      getProfile(sym).catch(() => null),
      fetchYahooFundamentals(sym).catch(() => null),
    ]);

    // Company name: prefer Finnhub profile, fall back to Yahoo Finance
    const resolvedName: string = profile?.name || yf?.name || sym;

    const marketRegime = calcMarketRegime(spyCandles);
    const result = analyze(sym, candles, marketRegime);

    // P/E, dividend, market cap — Finnhub first, Yahoo as fallback
    if (financials?.peTTM        != null) result.peRatio  = financials.peTTM;
    else if (yf?.peRatio         != null) result.peRatio  = yf.peRatio;
    if (financials?.dividendYield != null) result.dividend = financials.dividendYield;
    else if (yf?.dividendYield   != null) result.dividend = yf.dividendYield;
    if (profile?.marketCap) result.marketCap = profile.marketCap;
    else if (yf?.marketCap)  result.marketCap = yf.marketCap / 1_000_000; // Yahoo returns raw $, convert to millions

    // Extra fundamental fields for watchlist health badge (7-criteria scoring).
    // All values in "Finnhub raw units": %, not decimals (e.g. 18.3 = 18.3% ROE).
    // Yahoo Finance returns profitability/growth as decimals → multiply ×100 to normalise.
    const extra = {
      // Growth
      revenueGrowth:    financials?.revenueGrowthYoy  ?? (yf?.revenueGrowth  != null ? yf.revenueGrowth  * 100 : null),
      // Profitability
      roeTTM:           financials?.roeTTM            ?? (yf?.roeTTM         != null ? yf.roeTTM         * 100 : null),
      operatingMargin:  financials?.operatingMargin   ?? (yf?.operatingMargin != null ? yf.operatingMargin * 100 : null),
      profitMargin:     financials?.netMargin         ?? (yf?.profitMargin   != null ? yf.profitMargin   * 100 : null),
      // Leverage & Liquidity (same units across both sources — no conversion needed)
      debtToEquity:     financials?.debtToEquity      ?? yf?.debtToEquity    ?? null,
      currentRatio:     financials?.currentRatio      ?? yf?.currentRatio    ?? null,
      // Cash flow
      cashFlowPerShare: financials?.cashFlowPerShare  ?? yf?.cashFlowPerShare ?? null,
      // Analyst consensus (Finnhub gives buy/hold/sell breakdown; Yahoo only gives rating + count)
      analystRating:    financials?.recommendation    ?? yf?.analystRating   ?? null,
      analystBuy:       financials?.analystBuy  ?? 0,
      analystHold:      financials?.analystHold ?? 0,
      analystSell:      financials?.analystSell ?? 0,
    };

    return NextResponse.json({
      ...result,
      marketRegime,
      name:   resolvedName,
      sector: profile?.sector ?? '',
      ...extra,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
