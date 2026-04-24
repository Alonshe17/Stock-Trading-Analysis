import { analyze } from './analysis';
import type { Signal } from './analysis';
import type { Candle } from './finnhub';

export type BacktestTrade = {
  entryDate:  string;
  exitDate:   string;
  signal:     Signal;
  entryPrice: number;
  exitPrice:  number;
  stopLoss:   number;
  target:     number;
  pnlPct:     number;
  rMultiple:  number;   // P&L expressed in units of initial risk
  result:     'WIN' | 'LOSS' | 'TIMEOUT';
  holdDays:   number;
};

export type BacktestResult = {
  symbol:          string;
  periodStart:     string;
  periodEnd:       string;
  totalTrades:     number;
  winRate:         number;   // %
  avgWinPct:       number;   // %
  avgLossPct:      number;   // %
  profitFactor:    number;
  expectancy:      number;   // avg R multiple per trade
  totalReturnPct:  number;   // compound return (2% risk/trade)
  maxConsecLosses: number;
  bestTradePct:    number;
  worstTradePct:   number;
  trades:          BacktestTrade[];
  equityCurve:     { date: string; equity: number }[];
};

// ── Config ───────────────────────────────────────────────────────────────────
const WARMUP         = 210;   // candles needed for EMA-200 warmup
const MAX_HOLD       = 20;    // max bars before forced exit
const SLIPPAGE       = 0.001; // 0.1% entry slippage
const RISK_REWARD    = 2.0;   // target = entry + 2 × risk
const INITIAL_EQUITY = 10_000;
const RISK_PER_TRADE = 0.02;  // 2% of equity risked per trade
const COOLDOWN       = 3;     // min bars between trades

const ACTIONABLE: Signal[] = ['BREAKOUT', 'PULLBACK', 'MEAN_REVERT'];

// ── Engine ───────────────────────────────────────────────────────────────────
export function runBacktest(symbol: string, candles: Candle[]): BacktestResult | null {
  if (candles.length < WARMUP + MAX_HOLD + 5) return null;

  const trades:      BacktestTrade[]                      = [];
  const equityCurve: { date: string; equity: number }[]   = [];

  let prevSignal:     Signal | null = null;
  let lastTradeEndIdx               = 0;
  let equity                        = INITIAL_EQUITY;

  // Starting equity point
  equityCurve.push({
    date:   new Date(candles[WARMUP].t * 1000).toISOString().split('T')[0],
    equity: INITIAL_EQUITY,
  });

  for (let i = WARMUP; i < candles.length - MAX_HOLD - 2; i++) {
    // Enforce cooldown after last trade exit
    if (i <= lastTradeEndIdx + COOLDOWN) {
      prevSignal = null;
      continue;
    }

    const slice    = candles.slice(0, i + 1);
    const analysis = analyze(symbol, slice, 'BULLISH');
    const signal   = analysis.signal;

    // Enter only on a *fresh* actionable signal (transition into one)
    if (signal !== prevSignal && ACTIONABLE.includes(signal)) {
      prevSignal = signal;

      const entryCandleIdx = i + 1;
      if (entryCandleIdx >= candles.length) break;

      const entryCandle = candles[entryCandleIdx];
      const entryPrice  = entryCandle.o * (1 + SLIPPAGE);
      const atr         = (analysis.atrPct / 100) * analysis.price;
      const risk        = Math.max(2 * atr, entryPrice * 0.01); // minimum 1% stop
      const stopLoss    = entryPrice - risk;
      const target      = entryPrice + RISK_REWARD * risk;

      // ── Forward simulation ────────────────────────────────────────────────
      let exitIdx   = Math.min(entryCandleIdx + MAX_HOLD, candles.length - 1);
      let exitPrice = candles[exitIdx].c;
      let result:   'WIN' | 'LOSS' | 'TIMEOUT' = 'TIMEOUT';

      for (
        let j = entryCandleIdx + 1;
        j <= Math.min(entryCandleIdx + MAX_HOLD, candles.length - 1);
        j++
      ) {
        const c = candles[j];
        if (c.h >= target) {
          // Target hit — assume fill at target
          exitPrice = target;
          result    = 'WIN';
          exitIdx   = j;
          break;
        }
        if (c.l <= stopLoss) {
          // Stop hit — assume fill at stop
          exitPrice = stopLoss;
          result    = 'LOSS';
          exitIdx   = j;
          break;
        }
        exitIdx   = j;
        exitPrice = c.c;
      }

      const pnlPct   = ((exitPrice - entryPrice) / entryPrice) * 100;
      const rMultiple = risk > 0 ? (exitPrice - entryPrice) / risk : 0;

      // ── Equity update (fixed-fractional 2% risk) ──────────────────────────
      const riskFraction = Math.abs((entryPrice - stopLoss) / entryPrice);
      if (riskFraction > 0) {
        const positionWeight = RISK_PER_TRADE / riskFraction;
        equity = equity * (1 + positionWeight * (pnlPct / 100));
        equity = Math.max(equity, 0); // floor at zero
      }

      const exitCandle = candles[exitIdx];
      trades.push({
        entryDate:  new Date(entryCandle.t  * 1000).toISOString().split('T')[0],
        exitDate:   new Date(exitCandle.t   * 1000).toISOString().split('T')[0],
        signal,
        entryPrice,
        exitPrice,
        stopLoss,
        target,
        pnlPct,
        rMultiple,
        result,
        holdDays: exitIdx - entryCandleIdx,
      });

      equityCurve.push({
        date:   new Date(exitCandle.t * 1000).toISOString().split('T')[0],
        equity: Math.round(equity * 100) / 100,
      });

      lastTradeEndIdx = exitIdx;
    } else {
      prevSignal = signal;
    }
  }

  if (trades.length === 0) return null;

  // ── Statistics ────────────────────────────────────────────────────────────
  const wins   = trades.filter((t) => t.result === 'WIN');
  const losses = trades.filter((t) => t.result !== 'WIN');

  const winRate    = (wins.length / trades.length) * 100;
  const avgWinPct  = wins.length   > 0 ? wins.reduce((s, t)   => s + t.pnlPct, 0) / wins.length   : 0;
  const avgLossPct = losses.length > 0 ? losses.reduce((s, t) => s + t.pnlPct, 0) / losses.length : 0;

  const grossProfit = wins.reduce((s, t) => s + Math.max(t.pnlPct, 0), 0);
  const grossLoss   = Math.abs(losses.reduce((s, t) => s + Math.min(t.pnlPct, 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;

  const expectancy     = trades.reduce((s, t) => s + t.rMultiple, 0) / trades.length;
  const totalReturnPct = ((equity - INITIAL_EQUITY) / INITIAL_EQUITY) * 100;

  let maxConsecLosses = 0;
  let curLosses       = 0;
  for (const t of trades) {
    if (t.result !== 'WIN') { curLosses++; maxConsecLosses = Math.max(maxConsecLosses, curLosses); }
    else curLosses = 0;
  }

  return {
    symbol,
    periodStart:    new Date(candles[WARMUP].t          * 1000).toISOString().split('T')[0],
    periodEnd:      new Date(candles[candles.length - 1].t * 1000).toISOString().split('T')[0],
    totalTrades:    trades.length,
    winRate,
    avgWinPct,
    avgLossPct,
    profitFactor,
    expectancy,
    totalReturnPct,
    maxConsecLosses,
    bestTradePct:  Math.max(...trades.map((t) => t.pnlPct)),
    worstTradePct: Math.min(...trades.map((t) => t.pnlPct)),
    trades,
    equityCurve,
  };
}
