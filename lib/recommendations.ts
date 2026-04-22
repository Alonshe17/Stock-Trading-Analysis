import { fetchYahooCandles, fetchYahooFundamentals } from './yahoofetch';
import { analyze } from './analysis';
import type { AnalysisResult, Signal } from './analysis';
import type { StockMeta } from './globalUniverse';

export type { Signal };

export type Recommendation = {
  symbol: string;
  name: string;
  sector: string;
  exchange: string;
  currency: string;
  region: 'US' | 'ASIA' | 'EUR_UK' | 'GROWTH';
  price: number;
  signal: Signal;
  minerviniScore: number;
  rsi: number;
  atrPct: number;
  ema50: number;
  ema200: number;
  week52High: number;
  week52Low: number;
  distanceFromHigh: number;
  // Trade setup
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  stopPct: number;
  target: number;
  targetPct: number;
  riskReward: number;
  // Fundamentals
  peRatio: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  profitMargin: number | null;
  // Analyst
  analystRating: string | null;
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  numberOfAnalysts: number;
  analystUpside: number | null;
};

function signalOrder(signal: Signal): number {
  const order: Record<Signal, number> = {
    BREAKOUT:    0,
    PULLBACK:    1,
    MEAN_REVERT: 2,
    WATCH:       3,
    NEUTRAL:     4,
    AVOID:       5,
  };
  return order[signal] ?? 6;
}

function calcTradeSetup(
  signal: Signal,
  price: number,
  atrPct: number,
  ema50: number,
  ema200: number,
  week52High: number,
  targetMeanPrice: number | null,
): {
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  stopPct: number;
  target: number;
  targetPct: number;
  riskReward: number;
} {
  const atr = price * (atrPct / 100);

  let entryLow: number;
  let entryHigh: number;
  let stopLoss: number;

  if (signal === 'PULLBACK') {
    entryLow = Math.min(ema50 * 0.99, price * 0.97);
    entryHigh = price;
    const entry = (entryLow + entryHigh) / 2;
    stopLoss = Math.max(entry - 2 * atr, ema200 * 0.97);
  } else if (signal === 'BREAKOUT') {
    entryLow = price * 0.98;
    entryHigh = price * 1.015;
    const entry = (entryLow + entryHigh) / 2;
    stopLoss = entry - 2 * atr;
  } else if (signal === 'MEAN_REVERT') {
    entryLow = price;
    entryHigh = price * 1.03;
    const entry = (entryLow + entryHigh) / 2;
    stopLoss = entry - 2 * atr;
  } else {
    // WATCH / NEUTRAL / AVOID
    entryLow = price * 0.98;
    entryHigh = price;
    const entry = (entryLow + entryHigh) / 2;
    stopLoss = entry - 2 * atr;
  }

  const entry = (entryLow + entryHigh) / 2;

  // Target: use analyst mean target if > 5% above price, else 52-week high for MEAN_REVERT, else +15%
  let target: number;
  if (targetMeanPrice !== null && targetMeanPrice > price * 1.05) {
    target = targetMeanPrice;
  } else if (signal === 'MEAN_REVERT') {
    target = week52High;
  } else {
    target = price * 1.15;
  }

  const risk = entry - stopLoss;
  const reward = target - entry;
  const stopPct = entry > 0 ? (risk / entry) * 100 : 0;
  const targetPct = entry > 0 ? (reward / entry) * 100 : 0;
  const riskReward = stopPct > 0 ? targetPct / stopPct : 0;

  return {
    entryLow,
    entryHigh,
    stopLoss: Math.max(stopLoss, 0.01),
    stopPct: Math.max(stopPct, 0),
    target,
    targetPct: Math.max(targetPct, 0),
    riskReward: Math.max(riskReward, 0),
  };
}

export async function fetchRecommendations(
  stocks: StockMeta[],
  region: 'US' | 'ASIA' | 'EUR_UK' | 'GROWTH',
  marketRegime: 'BULLISH' | 'CAUTION' | 'BEARISH',
  maxResults = 20,
): Promise<Recommendation[]> {
  const results: Recommendation[] = [];

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];

    // Stagger requests to avoid rate limiting
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 150));
    }

    try {
      const [candles, fundamentals] = await Promise.all([
        fetchYahooCandles(stock.symbol),
        fetchYahooFundamentals(stock.symbol),
      ]);

      // Skip if not enough candle data
      if (candles.length < 60) continue;

      const analysis: AnalysisResult = analyze(stock.symbol, candles, marketRegime);

      // Skip AVOID and NEUTRAL signals (keep for WATCH and better)
      if (analysis.signal === 'AVOID' || analysis.signal === 'NEUTRAL') continue;

      const price = analysis.price;
      if (price <= 0) continue;

      const peRatio = fundamentals?.peRatio ?? null;
      const revenueGrowth = fundamentals?.revenueGrowth ?? null;
      const earningsGrowth = fundamentals?.earningsGrowth ?? null;
      const profitMargin = fundamentals?.profitMargin ?? null;
      const analystRating = fundamentals?.analystRating ?? null;
      const targetMeanPrice = fundamentals?.targetMeanPrice ?? null;
      const targetHighPrice = fundamentals?.targetHighPrice ?? null;
      const targetLowPrice = fundamentals?.targetLowPrice ?? null;
      const numberOfAnalysts = fundamentals?.numberOfAnalysts ?? 0;

      const analystUpside =
        targetMeanPrice !== null && price > 0
          ? ((targetMeanPrice - price) / price) * 100
          : null;

      const setup = calcTradeSetup(
        analysis.signal,
        price,
        analysis.atrPct,
        analysis.ema50,
        analysis.ema200,
        analysis.week52High,
        targetMeanPrice,
      );

      const rec: Recommendation = {
        symbol: stock.symbol,
        name: fundamentals?.name || stock.name,
        sector: fundamentals?.sector || stock.sector,
        exchange: stock.exchange,
        currency: fundamentals?.currency || stock.currency,
        region,
        price,
        signal: analysis.signal,
        minerviniScore: analysis.minerviniScore,
        rsi: analysis.rsi,
        atrPct: analysis.atrPct,
        ema50: analysis.ema50,
        ema200: analysis.ema200,
        week52High: analysis.week52High,
        week52Low: analysis.week52Low,
        distanceFromHigh: analysis.distanceFromHigh,
        ...setup,
        peRatio,
        revenueGrowth,
        earningsGrowth,
        profitMargin,
        analystRating,
        targetMeanPrice,
        targetHighPrice,
        targetLowPrice,
        numberOfAnalysts,
        analystUpside,
      };

      results.push(rec);
    } catch {
      // Skip stocks that error out
      continue;
    }
  }

  // Sort: signal order first, then by analystUpside desc within same signal
  results.sort((a, b) => {
    const sigDiff = signalOrder(a.signal) - signalOrder(b.signal);
    if (sigDiff !== 0) return sigDiff;
    const aUpside = a.analystUpside ?? -Infinity;
    const bUpside = b.analystUpside ?? -Infinity;
    return bUpside - aUpside;
  });

  return results.slice(0, maxResults);
}
