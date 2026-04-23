import { fetchYahooCandles } from './yahoofetch';
import { getFinancials } from './finnhub';
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
  // Fundamentals (raw Finnhub units — same as Watchlist)
  peRatio:          number | null;
  revenueGrowth:    number | null;  // decimal e.g. 0.12 = 12%
  earningsGrowth:   number | null;
  profitMargin:     number | null;  // decimal e.g. 0.15 = 15%
  roeTTM:           number | null;  // % e.g. 18.3
  operatingMargin:  number | null;  // % e.g. 12.4
  debtToEquity:     number | null;  // % where 100 = 1.0x D/E
  currentRatio:     number | null;
  cashFlowPerShare: number | null;  // $
  // Analyst
  analystRating: string | null;
  analystBuy:    number;
  analystHold:   number;
  analystSell:   number;
  numberOfAnalysts: number;
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice:  number | null;
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
      const [candles, financials] = await Promise.all([
        fetchYahooCandles(stock.symbol),
        getFinancials(stock.symbol).catch(() => null),
      ]);

      // Skip if not enough candle data
      if (candles.length < 60) continue;

      const analysis: AnalysisResult = analyze(stock.symbol, candles, marketRegime);

      // Skip AVOID and NEUTRAL signals (keep for WATCH and better)
      if (analysis.signal === 'AVOID' || analysis.signal === 'NEUTRAL') continue;

      const price = analysis.price;
      if (price <= 0) continue;

      // Map Finnhub financials → Recommendation fields
      // Finnhub returns growth values as %, TrendCard expects decimals (÷100)
      const peRatio         = financials?.peTTM ?? null;
      const revenueGrowth   = financials?.revenueGrowthYoy != null ? financials.revenueGrowthYoy / 100 : null;
      const earningsGrowth: number | null = null; // not on Finnhub free tier
      const profitMargin    = financials?.netMargin != null ? financials.netMargin / 100 : null;
      // Additional fields for 7-criteria health score (raw Finnhub units, same as Watchlist)
      const roeTTM          = financials?.roeTTM          ?? null;
      const operatingMargin = financials?.operatingMargin ?? null;
      const debtToEquity    = financials?.debtToEquity    ?? null;
      const currentRatio    = financials?.currentRatio    ?? null;
      const cashFlowPerShare= financials?.cashFlowPerShare?? null;
      const analystRating          = financials?.recommendation ?? null;
      const targetMeanPrice: null  = null; // requires Finnhub paid tier
      const targetHighPrice: null  = null;
      const targetLowPrice: null   = null;
      const analystUpside: null    = null;
      const numberOfAnalysts =
        (financials?.analystBuy ?? 0) + (financials?.analystHold ?? 0) + (financials?.analystSell ?? 0);

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
        name: stock.name,
        sector: stock.sector,
        exchange: stock.exchange,
        currency: stock.currency,
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
        roeTTM,
        operatingMargin,
        debtToEquity,
        currentRatio,
        cashFlowPerShare,
        analystRating,
        analystBuy:  financials?.analystBuy  ?? 0,
        analystHold: financials?.analystHold ?? 0,
        analystSell: financials?.analystSell ?? 0,
        numberOfAnalysts,
        targetMeanPrice,
        targetHighPrice,
        targetLowPrice,
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
