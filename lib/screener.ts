import { getCandles, getProfile } from './finnhub';
import { analyze, calcAverageVolume, type AnalysisResult } from './analysis';
import { SP500_LARGE_CAP } from './sp500';
import { fetchTVDataBatch } from './tradingview';

export type ScreenerEntry = AnalysisResult & {
  name: string;
  marketCap: number;
  avgVolume: number;
  sector: string;
  tvRating: string | null;
};

export async function runScreener(
  marketRegime: 'BULLISH' | 'CAUTION' | 'BEARISH',
  maxResults = 200,
): Promise<ScreenerEntry[]> {
  const results: ScreenerEntry[] = [];

  // Fetch TradingView technical ratings + sector in ONE batch request up front
  const tvData = await fetchTVDataBatch(SP500_LARGE_CAP).catch(() => new Map<string, import('./tradingview').TVData>());

  for (let i = 0; i < SP500_LARGE_CAP.length; i++) {
    const symbol = SP500_LARGE_CAP[i];
    try {
      // Stagger requests to avoid Yahoo Finance rate limits
      await new Promise((r) => setTimeout(r, 300));

      const [candles, profile] = await Promise.all([
        getCandles(symbol, 'D'),
        getProfile(symbol),
      ]);

      if (candles.length < 60) continue;
      if (profile && profile.marketCap < 10_000) continue; // < $10B

      const analysis = analyze(symbol, candles, marketRegime);
      const avgVolume = calcAverageVolume(candles, 20);

      if (avgVolume < 500_000) continue;

      const tv = tvData.get(symbol.toUpperCase());

      results.push({
        ...analysis,
        name: profile?.name ?? symbol,
        marketCap: profile?.marketCap ?? 0,
        avgVolume,
        sector: tv?.sector ?? profile?.sector ?? '',
        tvRating: tv?.tvRating ?? null,
      });
    } catch {
      // skip on error
    }
  }

  const signalOrder: Record<string, number> = { BREAKOUT: 0, PULLBACK: 1, MEAN_REVERT: 2, WATCH: 3 };
  results.sort((a, b) => {
    const so = (signalOrder[a.signal] ?? 9) - (signalOrder[b.signal] ?? 9);
    if (so !== 0) return so;
    return b.minerviniScore - a.minerviniScore;
  });

  return results.slice(0, maxResults);
}
