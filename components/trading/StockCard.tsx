import Link from 'next/link';
import type { AnalysisResult } from '@/lib/analysis';
import { SignalBadge } from './SignalBadge';
import { EarningsWarning } from './EarningsWarning';

type Props = {
  analysis: AnalysisResult;
  name: string;
  isEtf?: boolean;
  isSmallCap?: boolean;
  earningsDate?: string | null;
};

export function StockCard({ analysis, name, isEtf, isSmallCap, earningsDate }: Props) {
  const { symbol, price, change, rsi, atrPct, minerviniScore, signal, distanceFromHigh, pattern } = analysis;
  const changePos = change >= 0;

  return (
    <Link
      href={`/stock/${symbol}`}
      className="block rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-gray-600 hover:bg-gray-800/80"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-white">{symbol}</span>
            {isEtf && <span className="text-xs text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">ETF</span>}
            {isSmallCap && <span className="text-xs text-amber-500 border border-amber-700/50 rounded px-1.5 py-0.5">Small-Cap ⚠</span>}
          </div>
          <div className="text-sm text-gray-400 mt-0.5">{name}</div>
        </div>
        <SignalBadge signal={signal} />
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-semibold text-white">${price.toFixed(2)}</span>
        <span className={`text-sm font-medium ${changePos ? 'text-emerald-400' : 'text-red-400'}`}>
          {changePos ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>

      {earningsDate && <div className="mb-3"><EarningsWarning date={earningsDate} /></div>}

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Stat label="RSI" value={rsi.toFixed(1)} color={rsi < 35 ? 'text-emerald-400' : rsi > 70 ? 'text-red-400' : 'text-gray-300'} />
        <Stat label="ATR%" value={`${atrPct.toFixed(1)}%`} color="text-gray-300" />
        <Stat label="Score" value={`${minerviniScore}/6`} color={minerviniScore >= 5 ? 'text-emerald-400' : minerviniScore >= 3 ? 'text-amber-400' : 'text-red-400'} />
        <Stat label="Off High" value={`-${distanceFromHigh.toFixed(1)}%`} color={distanceFromHigh <= 5 ? 'text-emerald-400' : distanceFromHigh >= 20 ? 'text-amber-400' : 'text-gray-300'} />
        {pattern && <div className="col-span-2"><Stat label="Pattern" value={pattern} color="text-blue-400" /></div>}
      </div>
    </Link>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-gray-500 mb-0.5">{label}</div>
      <div className={`font-semibold ${color}`}>{value}</div>
    </div>
  );
}
