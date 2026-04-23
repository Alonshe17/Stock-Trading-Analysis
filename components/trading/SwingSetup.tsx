import type { AnalysisResult } from '@/lib/analysis';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export function SwingSetup({ a, portfolioSize = 10000 }: { a: AnalysisResult; portfolioSize?: number }) {
  if (!a.entryZone || !a.stopLoss || !a.target) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-sm text-gray-500">
        No active trade setup for this signal.
      </div>
    );
  }

  const [entryLow, entryHigh] = a.entryZone;
  const midEntry = (entryLow + entryHigh) / 2;
  const riskPerShare = midEntry - a.stopLoss;
  const rewardPerShare = a.target - midEntry;
  const riskPct = (riskPerShare / midEntry) * 100;

  // Position sizing: risk 2% of portfolio
  const portfolioRisk = portfolioSize * 0.02;
  const shares = riskPerShare > 0 ? Math.floor(portfolioRisk / riskPerShare) : 0;
  const positionValue = shares * midEntry;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Swing Trade Setup</h3>

      <div className="space-y-3 text-sm">
        {/* Visual price ladder */}
        <div className="rounded-lg bg-gray-800/60 p-4 space-y-2">
          <PriceLine label="Target" value={a.target} color="text-emerald-400" icon="▲" />
          <div className="ml-4 border-l-2 border-dashed border-emerald-800 h-3" />
          <PriceLine label="Entry Zone" value={`$${entryLow.toFixed(2)} – $${entryHigh.toFixed(2)}`} color="text-blue-400" icon="→" raw />
          <div className="ml-4 border-l-2 border-dashed border-red-800 h-3" />
          <PriceLine label="Stop Loss" value={a.stopLoss} color="text-red-400" icon="▼" />
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Risk/Share" value={`$${riskPerShare.toFixed(2)} (${riskPct.toFixed(1)}%)`} />
          <Metric label="Reward/Share" value={`$${rewardPerShare.toFixed(2)}`} />
          <MetricWithTip
            label={<>R:R Ratio<InfoTooltip title="Risk : Reward Ratio" side="top">
              <p>Compares potential profit to potential loss.</p>
              <ul className="mt-1 space-y-0.5">
                <li><span className="text-emerald-400 font-semibold">≥ 2:1</span> — Good. Gain $2 for every $1 risked.</li>
                <li><span className="text-amber-400 font-semibold">1–2:1</span> — Marginal. High conviction only.</li>
                <li><span className="text-red-400 font-semibold">&lt; 1:1</span> — Poor. Skip the trade.</li>
              </ul>
              <p className="mt-1 text-gray-600 text-xs">📚 Van K. Tharp, <em>Trade Your Way to Financial Freedom</em> (1998)</p>
            </InfoTooltip></>}
            value={a.rrRatio ? `1 : ${a.rrRatio.toFixed(1)}` : 'N/A'}
            highlight={!!a.rrRatio && a.rrRatio >= 2}
          />
          <MetricWithTip
            label={<>Pattern<InfoTooltip title="Candlestick Pattern" side="top" width="w-80">
              <ul className="space-y-1.5">
                <li><span className="text-white font-semibold">Pin Bar</span> — Long wick (≥ 2× body), tiny body at opposite end. Signals price rejection at a level. Bullish at support, bearish at resistance.</li>
                <li><span className="text-white font-semibold">Bullish Engulfing</span> — A large green candle whose body completely covers the prior red candle. Strong reversal signal at support.</li>
                <li><span className="text-white font-semibold">Inside Bar</span> — Today&apos;s high &lt; yesterday&apos;s high AND today&apos;s low &gt; yesterday&apos;s low. Consolidation — breakout above the high signals continuation.</li>
                <li><span className="text-white font-semibold">Breakout Candle</span> — Large body (&gt;1.5× ATR), closes near its high, often on rising volume. Signals strong directional momentum.</li>
              </ul>
              <p className="mt-1 text-gray-600 text-xs">📚 S. Nison, <em>Japanese Candlestick Charting Techniques</em> (1991)</p>
            </InfoTooltip></>}
            value={a.pattern ?? 'None'}
          />
        </div>

        {/* Position sizing (based on 2% portfolio risk) */}
        <div className="border-t border-gray-800 pt-3">
          <div className="text-xs text-gray-500 mb-2">Position Size (2% portfolio risk on ${portfolioSize.toLocaleString()})</div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Shares" value={shares.toString()} />
            <Metric label="Position Value" value={`$${positionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceLine({ label, value, color, icon, raw }: { label: string; value: number | string; color: string; icon: string; raw?: boolean }) {
  const display = raw ? value : `$${(value as number).toFixed(2)}`;
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-xs w-24">{label}</span>
      <span className={`font-semibold ${color} flex items-center gap-1`}>
        <span className="text-xs">{icon}</span> {display}
      </span>
    </div>
  );
}

import type { ReactNode } from 'react';

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded bg-gray-800/60 px-3 py-2">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${highlight ? 'text-emerald-400' : 'text-gray-200'}`}>{value}</div>
    </div>
  );
}

function MetricWithTip({ label, value, highlight }: { label: ReactNode; value: string; highlight?: boolean }) {
  return (
    <div className="rounded bg-gray-800/60 px-3 py-2">
      <div className="text-xs text-gray-500 mb-0.5 flex items-center">{label}</div>
      <div className={`text-sm font-semibold ${highlight ? 'text-emerald-400' : 'text-gray-200'}`}>{value}</div>
    </div>
  );
}
