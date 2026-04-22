import type { Signal } from '@/lib/analysis';
import { cn } from '@/lib/utils';

const config: Record<Signal, { label: string; className: string }> = {
  BREAKOUT:    { label: 'BREAKOUT',    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  PULLBACK:    { label: 'PULLBACK',    className: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  MEAN_REVERT: { label: 'MEAN REVERT', className: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  WATCH:       { label: 'WATCH',       className: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  AVOID:       { label: 'AVOID',       className: 'bg-red-500/20 text-red-400 border-red-500/40' },
  NEUTRAL:     { label: 'NEUTRAL',     className: 'bg-gray-500/20 text-gray-400 border-gray-500/40' },
};

export function SignalBadge({ signal, size = 'sm' }: { signal: Signal; size?: 'sm' | 'md' }) {
  const { label, className } = config[signal];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border font-mono font-semibold tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className,
      )}
    >
      {label}
    </span>
  );
}
