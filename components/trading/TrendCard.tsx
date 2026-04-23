import Link from 'next/link';
import { SignalBadge } from '@/components/trading/SignalBadge';
import { AddToWatchlistButton } from '@/components/trading/AddToWatchlistButton';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import type { Recommendation } from '@/lib/recommendations';
import type { StockCategory, DipAnalysis, CategoryMeta } from '@/lib/trendAnalysis';

interface Props {
  rec: Recommendation;
  dipAnalysis: DipAnalysis;
  longTermTrend: { label: string; color: string; bg: string; border: string };
  fundamentalHealth: { label: 'Strong' | 'Moderate' | 'Weak' | 'Unknown'; color: string; score: number; max: number; breakdown: { label: string; pass: boolean | null }[] };
  stockNote: string | null;
  category: StockCategory | null;
  categoryMeta: CategoryMeta | null;
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

function DipSeverityLabel({ severity }: { severity: 'mild' | 'moderate' | 'deep' }) {
  const map = {
    mild:     { label: 'Mild Dip',     cls: 'text-amber-300' },
    moderate: { label: 'Moderate Dip', cls: 'text-amber-400' },
    deep:     { label: 'Deep Dip',     cls: 'text-amber-200 font-bold' },
  };
  const { label, cls } = map[severity];
  return <span className={cls}>{label}</span>;
}

export function TrendCard({
  rec,
  dipAnalysis,
  longTermTrend,
  fundamentalHealth,
  stockNote,
  category,
  categoryMeta,
}: Props) {
  const isNonUsd = rec.currency !== 'USD';
  const currencyLabel = isNonUsd ? rec.currency : undefined;
  const urlSymbol = encodeURIComponent(rec.symbol);

  return (
    <div
      className={`bg-gray-900 border rounded-xl p-4 flex flex-col gap-3 transition-colors hover:border-gray-600 ${
        dipAnalysis.isDip
          ? dipAnalysis.severity === 'deep'
            ? 'border-amber-700/60'
            : 'border-amber-800/40'
          : 'border-gray-800'
      }`}
    >
      {/* Category Badge */}
      {category && categoryMeta && (
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${categoryMeta.color} ${categoryMeta.borderColor} ${categoryMeta.bgColor}`}
          >
            <span aria-hidden="true">{categoryMeta.icon}</span>
            {categoryMeta.label}
          </span>
          <span className="text-xs text-gray-600">{categoryMeta.horizon}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-base">{rec.symbol}</span>
            <SignalBadge signal={rec.signal} size="sm" />
            {/* Long-term trend pill */}
            <span
              className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${longTermTrend.color} ${longTermTrend.bg} ${longTermTrend.border}`}
            >
              {longTermTrend.label}
            </span>
          </div>
          <span className="text-gray-400 text-xs truncate">{rec.name}</span>
          <span className="text-gray-600 text-xs">
            {rec.exchange} · {rec.currency} · {rec.sector}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-white font-bold text-sm">
            {isNonUsd
              ? `${rec.price.toFixed(2)} ${rec.currency}`
              : `$${rec.price.toFixed(2)}`}
          </span>
          {fundamentalHealth.label !== 'Unknown' && (
            <span className={`inline-flex items-center text-xs font-medium ${fundamentalHealth.color}`}>
              {fundamentalHealth.label} Fundamentals ({fundamentalHealth.score}/{fundamentalHealth.max})
              <InfoTooltip title="Fundamental Health Score" side="top" width="w-72">
                <p className="mb-1.5">
                  Score <span className="font-semibold text-white">{fundamentalHealth.score}/{fundamentalHealth.max}</span> based on {fundamentalHealth.max} criteria:
                </p>
                <ul className="space-y-1">
                  {fundamentalHealth.breakdown.map((c) => (
                    <li key={c.label} className="flex items-start gap-1.5">
                      <span className={`mt-0.5 shrink-0 ${c.pass === true ? 'text-emerald-400' : c.pass === false ? 'text-red-400' : 'text-gray-600'}`}>
                        {c.pass === true ? '✓' : c.pass === false ? '✗' : '—'}
                      </span>
                      <span className={c.pass === null ? 'text-gray-600' : 'text-gray-300'}>{c.label}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-gray-500 text-xs">≥3 Strong · 2 Moderate · &lt;2 Weak</p>
                <p className="mt-1 text-gray-600 text-xs">📚 W. Buffett (Annual Letters) · B. Graham, <em>The Intelligent Investor</em> (1949)</p>
              </InfoTooltip>
            </span>
          )}
        </div>
      </div>

      {/* Dip Opportunity Banner */}
      {dipAnalysis.isDip && (
        <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-2 flex items-start gap-2">
          <span className="text-amber-400 text-sm mt-0.5" aria-hidden="true">🎯</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold">
              <DipSeverityLabel severity={dipAnalysis.severity} />
              {!dipAnalysis.longTermIntact && (
                <span className="ml-2 text-red-400 font-normal">Long-term trend broken</span>
              )}
            </span>
            <span className="text-xs text-amber-200/80 leading-snug">{dipAnalysis.reason}</span>
          </div>
        </div>
      )}

      {/* Stock Note */}
      {stockNote && (
        <p className="text-xs text-gray-500 italic leading-relaxed border-l-2 border-gray-700 pl-2">
          {stockNote}
        </p>
      )}

      {/* Metrics Row */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div>
          <span className="text-gray-500 text-xs inline-flex items-center">
            RSI
            <InfoTooltip title="RSI — Relative Strength Index (14)" side="top">
              <p>Momentum oscillator — ranges 0 to 100.</p>
              <ul className="mt-1 space-y-0.5">
                <li><span className="text-emerald-400 font-semibold">&lt; 35</span> — Oversold: potential bounce zone</li>
                <li><span className="text-gray-300 font-semibold">35–70</span> — Neutral: healthy trend range</li>
                <li><span className="text-red-400 font-semibold">&gt; 70</span> — Overbought: pullback risk</li>
              </ul>
              <p className="mt-1 text-gray-600 text-xs">📚 J.W. Wilder Jr., <em>New Concepts in Technical Trading Systems</em> (1978)</p>
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
              <p className="mt-1">
                <span className="text-emerald-400">5–6</span> = Strong ·{' '}
                <span className="text-amber-400">3–4</span> = Watch ·{' '}
                <span className="text-red-400">0–2</span> = Avoid
              </p>
            </InfoTooltip>
          </span>{' '}
          <span
            className={
              rec.minerviniScore >= 5
                ? 'text-emerald-400'
                : rec.minerviniScore >= 3
                ? 'text-amber-400'
                : 'text-red-400'
            }
          >
            {rec.minerviniScore}/6
          </span>
        </div>
        <div>
          <span className="text-gray-500 text-xs inline-flex items-center">
            ATR%
            <InfoTooltip title="ATR% — Average True Range as % of Price (14)" side="top">
              <p>Measures daily volatility as a % of the stock price. Higher = bigger daily moves.</p>
              <ul className="mt-1 space-y-0.5">
                <li><span className="text-emerald-400 font-semibold">&gt; 2%</span> — High volatility, good swing potential</li>
                <li><span className="text-amber-400 font-semibold">1–2%</span> — Moderate — workable swings</li>
                <li><span className="text-red-400 font-semibold">&lt; 1%</span> — Low volatility, smaller moves</li>
              </ul>
              <p className="mt-1 text-gray-400 text-xs">Used to size stops: stop = entry − 1.5× ATR.</p>
              <p className="mt-1 text-gray-600 text-xs">📚 J.W. Wilder Jr., <em>New Concepts in Technical Trading Systems</em> (1978)</p>
            </InfoTooltip>
          </span>{' '}
          <span className="text-gray-300">{rec.atrPct.toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-gray-500 text-xs mr-1">−High</span>
          <span
            className={
              rec.distanceFromHigh <= 5
                ? 'text-emerald-400'
                : rec.distanceFromHigh <= 20
                ? 'text-amber-400'
                : 'text-purple-400'
            }
          >
            {rec.distanceFromHigh.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Analyst Row */}
      {rec.numberOfAnalysts > 0 && (
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <AnalystRatingBadge rating={rec.analystRating} />
          {rec.analystUpside !== null && (
            <span
              className={`font-medium ${
                rec.analystUpside >= 10
                  ? 'text-emerald-400'
                  : rec.analystUpside >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {fmtPct(rec.analystUpside)} upside
            </span>
          )}
          <span className="text-gray-600">
            {rec.numberOfAnalysts} analyst{rec.numberOfAnalysts !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Fundamentals Row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <div>
          Rev:{' '}
          <span
            className={
              rec.revenueGrowth !== null && rec.revenueGrowth > 0.05
                ? 'text-emerald-400'
                : rec.revenueGrowth !== null && rec.revenueGrowth > 0
                ? 'text-gray-300'
                : 'text-red-400'
            }
          >
            {rec.revenueGrowth !== null ? fmtPct(rec.revenueGrowth * 100, 0) : '—'}
          </span>
        </div>
        <div>
          EPS:{' '}
          <span
            className={
              rec.earningsGrowth !== null && rec.earningsGrowth > 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }
          >
            {rec.earningsGrowth !== null ? fmtPct(rec.earningsGrowth * 100, 0) : '—'}
          </span>
        </div>
        <div>
          P/E:{' '}
          <span className="text-gray-400">
            {rec.peRatio !== null ? rec.peRatio.toFixed(1) : '—'}
          </span>
        </div>
        <div>
          Margin:{' '}
          <span className="text-gray-400">
            {rec.profitMargin !== null ? fmtPct(rec.profitMargin * 100, 1) : '—'}
          </span>
        </div>
      </div>

      {/* Trade Setup (compact) */}
      <div className="bg-gray-950 rounded-lg px-3 py-2">
        <div className="grid grid-cols-4 gap-2 text-xs text-center">
          <div>
            <div className="text-gray-600 mb-0.5">Entry</div>
            <div className="text-gray-200">
              {fmt(rec.entryLow, 0, currencyLabel)}–{fmt(rec.entryHigh, 0, currencyLabel)}
            </div>
          </div>
          <div>
            <div className="text-gray-600 mb-0.5">Stop</div>
            <div className="text-red-400">
              {fmt(rec.stopLoss, 2, currencyLabel)}
              <span className="text-red-500 ml-0.5">({fmtPct(-rec.stopPct)})</span>
            </div>
          </div>
          <div>
            <div className="text-gray-600 mb-0.5">Target</div>
            <div className="text-emerald-400">
              {fmt(rec.target, 2, currencyLabel)}
              <span className="text-emerald-500 ml-0.5">({fmtPct(rec.targetPct)})</span>
            </div>
          </div>
          <div>
            <div className="text-gray-600 mb-0.5 flex items-center justify-center gap-0.5">
              R:R
              <InfoTooltip title="Risk : Reward Ratio" side="top">
                <p>Potential profit divided by potential loss.</p>
                <ul className="mt-1 space-y-0.5">
                  <li><span className="text-emerald-400 font-semibold">≥ 2:1</span> — Good setup</li>
                  <li><span className="text-amber-400 font-semibold">1–2:1</span> — Marginal</li>
                  <li><span className="text-red-400 font-semibold">&lt; 1:1</span> — Poor risk</li>
                </ul>
              </InfoTooltip>
            </div>
            <div>
              <RrColor rr={rec.riskReward} />
            </div>
          </div>
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
