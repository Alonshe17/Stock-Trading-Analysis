'use client';

import { useState, useRef } from 'react';
import { TradingNav } from '@/components/trading/TradingNav';
import type { BacktestResult, BacktestTrade } from '@/lib/backtest';

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(v: number, dp = 1) {
  const s = v >= 0 ? '+' : '';
  return `${s}${v.toFixed(dp)}%`;
}
function fmt2(v: number) { return `$${v.toFixed(2)}`; }

function SignalPill({ signal }: { signal: string }) {
  const cls: Record<string, string> = {
    BREAKOUT:    'bg-blue-900/60 text-blue-300 border-blue-700/50',
    PULLBACK:    'bg-amber-900/60 text-amber-300 border-amber-700/50',
    MEAN_REVERT: 'bg-purple-900/60 text-purple-300 border-purple-700/50',
  };
  const label: Record<string, string> = {
    BREAKOUT: 'Breakout', PULLBACK: 'Pullback', MEAN_REVERT: 'Mean Rev',
  };
  return (
    <span className={`text-xs border rounded px-1.5 py-0.5 font-medium ${cls[signal] ?? 'bg-gray-800 text-gray-400'}`}>
      {label[signal] ?? signal}
    </span>
  );
}

function ResultPill({ result }: { result: BacktestTrade['result'] }) {
  const cls = result === 'WIN'
    ? 'text-emerald-400 font-semibold'
    : result === 'LOSS'
    ? 'text-red-400 font-semibold'
    : 'text-gray-500';
  const label = result === 'WIN' ? '✓ Win' : result === 'LOSS' ? '✗ Loss' : '— Time';
  return <span className={cls}>{label}</span>;
}

// ── Equity curve (SVG) ────────────────────────────────────────────────────────
function EquityCurve({ curve }: { curve: { date: string; equity: number }[] }) {
  if (curve.length < 2) return null;

  const W = 800, H = 180, PAD = { t: 12, r: 16, b: 32, l: 56 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const equities = curve.map((p) => p.equity);
  const minE = Math.min(...equities);
  const maxE = Math.max(...equities);
  const range = maxE - minE || 1;

  const toX = (i: number) => PAD.l + (i / (curve.length - 1)) * innerW;
  const toY = (e: number) => PAD.t + innerH - ((e - minE) / range) * innerH;

  const linePath = curve
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.equity).toFixed(1)}`)
    .join(' ');

  const areaPath =
    `M${toX(0).toFixed(1)},${(PAD.t + innerH).toFixed(1)} ` +
    linePath.replace('M', 'L') +
    ` L${toX(curve.length - 1).toFixed(1)},${(PAD.t + innerH).toFixed(1)} Z`;

  const baseline = toY(10_000);
  const finalUp  = equities[equities.length - 1] >= 10_000;
  const lineColor = finalUp ? '#34d399' : '#f87171';

  // Y-axis tick labels
  const yTicks = [minE, 10_000, maxE].filter((v, i, a) => a.indexOf(v) === i);

  // X-axis: show first, middle, last date
  const xLabels = [0, Math.floor((curve.length - 1) / 2), curve.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 180 }}
      aria-label="Equity curve"
    >
      {/* Grid lines */}
      {yTicks.map((v) => (
        <line
          key={v}
          x1={PAD.l} x2={W - PAD.r}
          y1={toY(v)} y2={toY(v)}
          stroke="#374151" strokeWidth="1" strokeDasharray="4 4"
        />
      ))}
      {/* Baseline (starting equity) */}
      <line
        x1={PAD.l} x2={W - PAD.r}
        y1={baseline} y2={baseline}
        stroke="#6b7280" strokeWidth="1" strokeDasharray="6 3"
      />

      {/* Area fill */}
      <path d={areaPath} fill={lineColor} fillOpacity="0.08" />
      {/* Line */}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" />

      {/* Dots at each trade */}
      {curve.map((p, i) => (
        <circle key={i} cx={toX(i)} cy={toY(p.equity)} r="3"
          fill={p.equity >= 10_000 ? '#34d399' : '#f87171'} />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((v) => (
        <text key={v} x={PAD.l - 6} y={toY(v) + 4}
          textAnchor="end" fontSize="10" fill="#9ca3af">
          ${(v / 1000).toFixed(1)}k
        </text>
      ))}
      {/* X-axis labels */}
      {xLabels.map((i) => (
        <text key={i} x={toX(i)} y={H - 4}
          textAnchor="middle" fontSize="10" fill="#6b7280">
          {curve[i].date.slice(0, 7)}
        </text>
      ))}
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BacktestPage() {
  const [symbol,  setSymbol]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [result,  setResult]  = useState<BacktestResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function runBacktest() {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/backtest?symbol=${encodeURIComponent(sym)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong');
      } else {
        setResult(data as BacktestResult);
      }
    } catch {
      setError('Failed to connect — try again');
    }
    setLoading(false);
  }

  const wins    = result?.trades.filter((t) => t.result === 'WIN').length   ?? 0;
  const losses  = result?.trades.filter((t) => t.result === 'LOSS').length  ?? 0;
  const timeouts = result?.trades.filter((t) => t.result === 'TIMEOUT').length ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Signal Backtester</h1>
            <p className="text-gray-400 text-sm mt-1">
              Replay Breakout · Pullback · Mean Reversion signals on 2 years of daily data
            </p>
          </div>
          <TradingNav active="/backtest" />
        </div>

        {/* Input */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <div className="flex gap-3 flex-wrap">
            <input
              ref={inputRef}
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && runBacktest()}
              placeholder="Enter ticker — e.g. TSLA, NVDA, STAN.L"
              className="flex-1 min-w-[200px] rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none uppercase"
            />
            <button
              onClick={runBacktest}
              disabled={loading || !symbol.trim()}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {loading
                ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Running…</>
                : '▶ Run Backtest'
              }
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-600 mt-3 leading-relaxed">
            ⚠️ Signals are identified using market regime = BULLISH throughout. Entry = next open + 0.1% slippage · Stop = 2× ATR · Target = 2:1 R:R · Max hold = 20 days · Position sizing = 2% fixed-fractional risk on a $10,000 portfolio. Past performance does not guarantee future results.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-800 bg-red-900/20 p-4 mb-6 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">

            {/* Period & trade count banner */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <span className="text-white font-bold text-lg">{result.symbol}</span>
              <span className="text-gray-600">·</span>
              <span>{result.periodStart} → {result.periodEnd}</span>
              <span className="text-gray-600">·</span>
              <span>{result.totalTrades} trades</span>
              <span className="text-gray-600">·</span>
              <span className="text-emerald-400">{wins}W</span>
              <span className="text-red-400">{losses}L</span>
              <span className="text-gray-500">{timeouts} timeout</span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat
                label="Win Rate"
                value={`${result.winRate.toFixed(1)}%`}
                sub={`${wins} wins / ${result.totalTrades} trades`}
                color={result.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}
              />
              <Stat
                label="Avg Win"
                value={pct(result.avgWinPct)}
                sub="per winning trade"
                color="text-emerald-400"
              />
              <Stat
                label="Avg Loss"
                value={pct(result.avgLossPct)}
                sub="per losing trade"
                color="text-red-400"
              />
              <Stat
                label="Profit Factor"
                value={result.profitFactor >= 99 ? '∞' : result.profitFactor.toFixed(2)}
                sub="gross profit ÷ gross loss"
                color={result.profitFactor >= 1.5 ? 'text-emerald-400' : result.profitFactor >= 1 ? 'text-amber-400' : 'text-red-400'}
              />
              <Stat
                label="Expectancy"
                value={`${result.expectancy >= 0 ? '+' : ''}${result.expectancy.toFixed(2)}R`}
                sub="avg R per trade"
                color={result.expectancy >= 0.3 ? 'text-emerald-400' : result.expectancy >= 0 ? 'text-amber-400' : 'text-red-400'}
              />
              <Stat
                label="Total Return"
                value={pct(result.totalReturnPct)}
                sub="2% fixed-fractional sizing"
                color={result.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}
              />
              <Stat
                label="Best Trade"
                value={pct(result.bestTradePct)}
                color="text-emerald-400"
              />
              <Stat
                label="Worst Trade"
                value={pct(result.worstTradePct)}
                sub={`Max ${result.maxConsecLosses} consec. losses`}
                color="text-red-400"
              />
            </div>

            {/* Equity curve */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Equity Curve</h3>
                <span className="text-xs text-gray-600">$10,000 starting capital</span>
              </div>
              <EquityCurve curve={result.equityCurve} />
            </div>

            {/* Trade log */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Trade Log</h3>
                <span className="text-xs text-gray-600">{result.trades.length} trades · newest first</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-800">
                      <th className="px-4 py-2.5 text-left font-medium">#</th>
                      <th className="px-4 py-2.5 text-left font-medium">Signal</th>
                      <th className="px-4 py-2.5 text-left font-medium">Entry Date</th>
                      <th className="px-4 py-2.5 text-left font-medium">Exit Date</th>
                      <th className="px-4 py-2.5 text-right font-medium">Entry</th>
                      <th className="px-4 py-2.5 text-right font-medium">Stop</th>
                      <th className="px-4 py-2.5 text-right font-medium">Target</th>
                      <th className="px-4 py-2.5 text-right font-medium">Exit</th>
                      <th className="px-4 py-2.5 text-right font-medium">P&L</th>
                      <th className="px-4 py-2.5 text-right font-medium">R</th>
                      <th className="px-4 py-2.5 text-right font-medium">Days</th>
                      <th className="px-4 py-2.5 text-right font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...result.trades].reverse().map((t, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-gray-800/60 text-xs hover:bg-gray-800/40 transition ${
                          t.result === 'WIN'  ? 'bg-emerald-950/20' :
                          t.result === 'LOSS' ? 'bg-red-950/20' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 text-gray-600">{result.trades.length - idx}</td>
                        <td className="px-4 py-2.5"><SignalPill signal={t.signal} /></td>
                        <td className="px-4 py-2.5 text-gray-400">{t.entryDate}</td>
                        <td className="px-4 py-2.5 text-gray-400">{t.exitDate}</td>
                        <td className="px-4 py-2.5 text-right text-gray-300">{fmt2(t.entryPrice)}</td>
                        <td className="px-4 py-2.5 text-right text-red-400/70">{fmt2(t.stopLoss)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-400/70">{fmt2(t.target)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-300">{fmt2(t.exitPrice)}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${t.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pct(t.pnlPct)}
                        </td>
                        <td className={`px-4 py-2.5 text-right ${t.rMultiple >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                          {t.rMultiple >= 0 ? '+' : ''}{t.rMultiple.toFixed(2)}R
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{t.holdDays}d</td>
                        <td className="px-4 py-2.5 text-right"><ResultPill result={t.result} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center text-gray-600">
            <p className="text-4xl mb-3">📈</p>
            <p className="text-sm">Enter a ticker above and click Run Backtest to see how the signals performed historically.</p>
            <p className="text-xs mt-2">Try: TSLA · NVDA · AAPL · AMZN · MSFT · STAN.L · AZN</p>
          </div>
        )}

      </div>
    </div>
  );
}
