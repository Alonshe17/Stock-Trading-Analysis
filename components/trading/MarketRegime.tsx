'use client';

type Regime = 'BULLISH' | 'CAUTION' | 'BEARISH';

const config: Record<Regime, { label: string; desc: string; dot: string; bar: string }> = {
  BULLISH:  { label: 'BULLISH',  desc: 'SPY above 50 EMA & 200 EMA — Buy signals active',    dot: 'bg-emerald-400', bar: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  CAUTION:  { label: 'CAUTION',  desc: 'SPY near key levels — Selective entries only',        dot: 'bg-amber-400',   bar: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  BEARISH:  { label: 'BEARISH',  desc: 'SPY below 200 EMA — Avoid new longs, risk is high',  dot: 'bg-red-400',     bar: 'bg-red-500/10 border-red-500/30 text-red-400' },
};

export function MarketRegime({ regime }: { regime: Regime }) {
  const { label, desc, dot, bar } = config[regime];
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${bar}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${dot} animate-pulse`} />
      <span className="font-semibold">Market Regime: {label}</span>
      <span className="opacity-60 hidden sm:inline">— {desc}</span>
    </div>
  );
}
