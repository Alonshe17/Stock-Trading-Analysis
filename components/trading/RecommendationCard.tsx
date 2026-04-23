import Link from 'next/link';
import { SignalBadge } from '@/components/trading/SignalBadge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { AddToWatchlistButton } from '@/components/trading/AddToWatchlistButton';
import { getFundamentalHealth } from '@/lib/trendAnalysis';
import type { Recommendation } from '@/lib/recommendations';

interface Props {
  rec: Recommendation;
}

function fmt(value: number | null | undefined, decimals = 2, currency?: string): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const formatted = value.toFixed(decimals);
  return currency && currency !== 'USD' ? `${formatted} ${currency}` : `$${formatted}`;
}

function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

function fmtMultiple(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${value.toFixed(1)}x`;
}

function AnalystRatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return null;
  const colors: Record<string, string> = {
    'Strong Buy': 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50',
    'Buy':        'bg-green-900/50 text-green-400 border-green-700/50',
    'Hold':       'bg-amber-900/50 text-amber-400 border-amber-700/50',
    'Underperform': 'bg-red-900/50 text-red-400 border-red-700/50',
    'Sell':       'bg-red-900/50 text-red-400 border-red-700/50',
  };
  const cls = colors[rating] ?? 'bg-gray-800 text-gray-400 border-gray-700';
  return (
    <span className={`text-xs border rounded px-1.5 py-0.5 font-medium ${cls}`}>
      {rating}
    </span>
  );
}

function RsiDisplay({ rsi }: { rsi: number }) {
  let color = 'text-gray-300';
  if (rsi < 35) color = 'text-emerald-400';
  else if (rsi > 70) color = 'text-red-400';
  return <span className={color}>{rsi.toFixed(1)}</span>;
}

function RrColor({ rr }: { rr: number }) {
  let color = 'text-red-400';
  if (rr >= 2) color = 'text-emerald-400';
  else if (rr >= 1) color = 'text-amber-400';
  return <span className={`font-semibold ${color}`}>{rr.toFixed(1)}:1</span>;
}

export function RecommendationCard({ rec }: Props) {
  const isNonUsd = rec.currency !== 'USD';
  const currencyLabel = isNonUsd ? rec.currency : undefined;
  const urlSymbol = encodeURIComponent(rec.symbol);
  const health = getFundamentalHealth(rec);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-base">{rec.symbol}</span>
            {rec.analystRating && <AnalystRatingBadge rating={rec.analystRating} />}
          </div>
          <span className="text-gray-400 text-xs truncate">{rec.name}</span>
          <span className="text-gray-600 text-xs">
            {rec.exchange} · {rec.currency} · {rec.sector}
          </span>
        </div>
        <div className="flex-shrink-0">
          <SignalBadge signal={rec.signal} size="sm" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div>
          <span className="text-gray-500 text-xs mr-1">Price</span>
          <span className="text-white font-bold">
            {isNonUsd
              ? `${rec.price.toFixed(2)} ${rec.currency}`
              : `$${rec.price.toFixed(2)}`}
          </span>
        </div>
        <div>
          <span className="text-gray-500 text-xs inline-flex items-center">
            RSI
            <InfoTooltip title="RSI — Relative Strength Index (14)" side="bottom">
              <p>Momentum oscillator, 0–100:</p>
              <ul className="mt-1 space-y-0.5">
                <li><span className="text-emerald-400">Below 35</span> — Oversold, watch for bounce</li>
                <li><span className="text-gray-300">35–70</span> — Neutral</li>
                <li><span className="text-red-400">Above 70</span> — Overbought, caution</li>
              </ul>
            </InfoTooltip>
          </span>{' '}
          <RsiDisplay rsi={rec.rsi} />
        </div>
        <div>
          <span className="text-gray-500 text-xs inline-flex items-center">
            Minervini
            <InfoTooltip title="Minervini Trend Score (0–6)" side="bottom">
              <p>Trend Template checklist — 1 point per condition met:</p>
              <ol className="mt-1 space-y-0.5 list-decimal list-inside">
                <li>Price &gt; EMA 50</li>
                <li>Price &gt; EMA 150</li>
                <li>Price &gt; EMA 200</li>
                <li>EMA 50 &gt; 150 &gt; 200</li>
                <li>EMA 200 trending up</li>
                <li>Within 25% of 52-week high</li>
              </ol>
              <p className="mt-1"><span className="text-emerald-400">5–6</span> = Strong · <span className="text-amber-400">3–4</span> = Watch · <span className="text-red-400">0–2</span> = Avoid</p>
            </InfoTooltip>
          </span>{' '}
          <span className="text-gray-300">{rec.minerviniScore}/6</span>
        </div>
        <div>
          <span className="text-gray-500 text-xs inline-flex items-center">
            ATR%
            <InfoTooltip title="ATR% — Daily Volatility as % of Price" side="bottom">
              <p>Average True Range expressed as a percentage of price. Shows how much the stock typically moves each day.</p>
              <p className="mt-1"><span className="text-emerald-400">&gt;2%</span> High swing potential · <span className="text-amber-400">1–2%</span> Moderate · <span className="text-red-400">&lt;1%</span> Slow mover</p>
              <p className="mt-1 text-gray-500">Used to set stop-loss distance and position size.</p>
            </InfoTooltip>
          </span>{' '}
          <span className="text-gray-300">{rec.atrPct.toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-gray-500 text-xs inline-flex items-center">
            −High
            <InfoTooltip title="Distance from 52-Week High" side="bottom">
              <p>How far the current price sits below its 52-week high.</p>
              <ul className="mt-1 space-y-0.5">
                <li><span className="text-emerald-400">0–5%</span> — Near highs, breakout zone</li>
                <li><span className="text-amber-400">5–20%</span> — Pullback territory</li>
                <li><span className="text-purple-400">20–35%</span> — Mean reversion candidate</li>
              </ul>
            </InfoTooltip>
          </span>{' '}
          <span className="text-gray-300">{rec.distanceFromHigh.toFixed(1)}%</span>
        </div>
      </div>

      {/* Trade Setup */}
      <div className="bg-gray-950 rounded-lg p-3">
        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
          Trade Setup
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-gray-400">Entry Zone</div>
          <div className="text-gray-100 text-right">
            {fmt(rec.entryLow, 2, currencyLabel)} – {fmt(rec.entryHigh, 2, currencyLabel)}
          </div>

          <div className="text-gray-400">Stop Loss</div>
          <div className="text-right">
            <span className="text-red-400">
              {fmt(rec.stopLoss, 2, currencyLabel)}{' '}
              <span className="text-red-500 text-xs">({fmtPct(-rec.stopPct)})</span>
            </span>
          </div>

          <div className="text-gray-400">Target</div>
          <div className="text-right">
            <span className="text-emerald-400">
              {fmt(rec.target, 2, currencyLabel)}{' '}
              <span className="text-emerald-500 text-xs">({fmtPct(rec.targetPct)})</span>
            </span>
          </div>

          <div className="text-gray-400 flex items-center">
            R:R
            <InfoTooltip title="Risk : Reward Ratio" side="top">
              <p>Compares potential profit to potential loss on the trade.</p>
              <ul className="mt-1 space-y-0.5">
                <li><span className="text-emerald-400 font-semibold">≥ 2:1</span> — Good. You risk $1 to make $2+.</li>
                <li><span className="text-amber-400 font-semibold">1–2:1</span> — Marginal. Only take with high-conviction setup.</li>
                <li><span className="text-red-400 font-semibold">&lt; 1:1</span> — Poor. Not worth the risk.</li>
              </ul>
              <p className="mt-1 text-gray-500">Calculated as (Target − Entry) ÷ (Entry − Stop Loss).</p>
            </InfoTooltip>
          </div>
          <div className="text-right">
            <RrColor rr={rec.riskReward} />
          </div>
        </div>
      </div>

      {/* Analyst Section */}
      {rec.numberOfAnalysts > 0 && (
        <div className="bg-gray-950 rounded-lg p-3">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
            Analyst Consensus
          </div>
          <div className="text-xs text-gray-400 mb-1.5">
            {rec.numberOfAnalysts} analyst{rec.numberOfAnalysts !== 1 ? 's' : ''}
            {rec.analystRating ? ` · ${rec.analystRating}` : ''}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-gray-500">Mean Target</span>
            <span className="text-gray-200 text-right">{fmt(rec.targetMeanPrice, 2, currencyLabel)}</span>
            <span className="text-gray-500">High Target</span>
            <span className="text-gray-200 text-right">{fmt(rec.targetHighPrice, 2, currencyLabel)}</span>
            <span className="text-gray-500">Low Target</span>
            <span className="text-gray-200 text-right">{fmt(rec.targetLowPrice, 2, currencyLabel)}</span>
          </div>
          {rec.analystUpside !== null && (
            <div className={`text-xs mt-2 font-medium flex items-center gap-1 ${rec.analystUpside >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              Upside: {fmtPct(rec.analystUpside)} to mean target
              <InfoTooltip title="Analyst Price Target Upside" side="top">
                <p>The percentage difference between the current price and the consensus analyst mean price target.</p>
                <ul className="mt-1 space-y-0.5">
                  <li><span className="text-emerald-400">Positive %</span> — Analysts expect the stock to rise from here.</li>
                  <li><span className="text-red-400">Negative %</span> — Current price already exceeds analyst targets.</li>
                </ul>
                <p className="mt-1 text-gray-500">Based on Wall Street analyst 12-month price targets. More analysts = more reliable consensus.</p>
              </InfoTooltip>
            </div>
          )}
        </div>
      )}

      {/* Fundamental Health */}
      <div className="flex flex-wrap items-center gap-3">
        {health.label !== 'Unknown' && (
          <span className={`inline-flex items-center text-xs font-medium ${health.color}`}>
            {health.label} Fundamentals ({health.score}/{health.max})
            <InfoTooltip title="Fundamental Health Score" side="top" width="w-72">
              <p className="mb-1.5">
                Score <span className="font-semibold text-white">{health.score}/{health.max}</span> based on {health.max} criteria:
              </p>
              <ul className="space-y-1">
                {health.breakdown.map((c) => (
                  <li key={c.label} className="flex items-start gap-1.5">
                    <span className={`mt-0.5 shrink-0 ${c.pass === true ? 'text-emerald-400' : c.pass === false ? 'text-red-400' : 'text-gray-600'}`}>
                      {c.pass === true ? '✓' : c.pass === false ? '✗' : '—'}
                    </span>
                    <span className={c.pass === null ? 'text-gray-600' : 'text-gray-300'}>{c.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-gray-500 text-xs">5–7 Strong · 3–4 Moderate · 0–2 Weak</p>
              <p className="mt-1 text-gray-600 text-xs">📚 W. Buffett (Annual Letters) · B. Graham, <em>The Intelligent Investor</em> (1949)</p>
            </InfoTooltip>
          </span>
        )}

        {/* Secondary fundamentals numbers */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
          {rec.peRatio !== null && <span>P/E {rec.peRatio.toFixed(1)}</span>}
          {rec.revenueGrowth !== null && (
            <span className={rec.revenueGrowth > 0 ? 'text-gray-500' : 'text-gray-600'}>
              Rev {fmtPct(rec.revenueGrowth * 100, 0)}
            </span>
          )}
          {rec.earningsGrowth !== null && (
            <span className={rec.earningsGrowth > 0 ? 'text-gray-500' : 'text-gray-600'}>
              EPS {fmtPct(rec.earningsGrowth * 100, 0)}
            </span>
          )}
          {rec.profitMargin !== null && (
            <span>Margin {fmtPct(rec.profitMargin * 100, 1)}</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-gray-800 flex items-center justify-between gap-2">
        <Link
          href={`/stock/${urlSymbol}`}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Full Analysis →
        </Link>
        <AddToWatchlistButton symbol={rec.symbol} name={rec.name} />
      </div>
    </div>
  );
}
