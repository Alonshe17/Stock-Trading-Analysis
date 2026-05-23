'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WatchlistStar } from '@/components/trading/WatchlistStar';
import { AddToWatchlistButton } from '@/components/trading/AddToWatchlistButton';
import type { WeeklyVolumeResult, WeeklySignal } from '@/lib/weeklyVolumeScanner';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtCap(m: number) {
  if (m >= 1_000_000) return `$${(m / 1_000_000).toFixed(1)}T`;
  if (m >= 1_000)     return `$${(m / 1_000).toFixed(1)}B`;
  return `$${m.toFixed(0)}M`;
}

// ── Signal styling ─────────────────────────────────────────────────────────────

const SIGNAL_META: Record<WeeklySignal, {
  label: string; badge: string; dot: string; row: string;
}> = {
  'breakout':           { label: '🚀 Breakout',      badge: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50', dot: 'bg-emerald-400', row: 'hover:bg-emerald-950/30' },
  'surge-up':           { label: '↑ Surge Up',       badge: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40', dot: 'bg-emerald-600', row: 'hover:bg-emerald-950/20' },
  'quiet-accumulation': { label: '🤫 Accumulation',  badge: 'bg-blue-900/30 text-blue-400 border-blue-700/40',          dot: 'bg-blue-500',   row: 'hover:bg-blue-950/20'    },
  'distribution':       { label: '🔴 Distribution',  badge: 'bg-orange-900/30 text-orange-400 border-orange-700/40',    dot: 'bg-orange-500', row: 'hover:bg-orange-950/20'  },
  'surge-down':         { label: '↓ Surge Down',     badge: 'bg-red-900/30 text-red-400 border-red-700/40',             dot: 'bg-red-600',    row: 'hover:bg-red-950/20'     },
  'breakdown':          { label: '💥 Breakdown',     badge: 'bg-red-500/25 text-red-200 border-red-500/50',             dot: 'bg-red-400',    row: 'hover:bg-red-950/30'     },
  'normal':             { label: 'Normal',            badge: 'bg-gray-800 text-gray-500 border-gray-700/40',             dot: 'bg-gray-600',   row: 'hover:bg-gray-900/40'    },
};

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ results }: { results: WeeklyVolumeResult[] }) {
  const counts: Partial<Record<WeeklySignal, number>> = {};
  for (const r of results) counts[r.signal] = (counts[r.signal] ?? 0) + 1;

  const items: { signal: WeeklySignal; label: string; badge: string }[] = [
    { signal: 'breakout',           label: '🚀 Breakouts',     badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'  },
    { signal: 'surge-up',           label: '↑ Surge Up',       badge: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40'  },
    { signal: 'quiet-accumulation', label: '🤫 Accumulation',  badge: 'bg-blue-900/30 text-blue-400 border-blue-700/40'           },
    { signal: 'distribution',       label: '🔴 Distribution',  badge: 'bg-orange-900/30 text-orange-400 border-orange-700/40'     },
    { signal: 'surge-down',         label: '↓ Surge Down',     badge: 'bg-red-900/30 text-red-400 border-red-700/40'              },
    { signal: 'breakdown',          label: '💥 Breakdowns',    badge: 'bg-red-500/20 text-red-300 border-red-500/40'              },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {items.map(({ signal, label, badge }) => (
        <span key={signal} className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold ${badge}`}>
          {label} <span className="opacity-70">{counts[signal] ?? 0}</span>
        </span>
      ))}
      <span className="px-3 py-1.5 rounded-full border border-gray-700/40 bg-gray-800 text-gray-400 text-[11px] font-semibold ml-auto">
        {results.length} stocks scanned
      </span>
    </div>
  );
}

// ── Expanded row ──────────────────────────────────────────────────────────────

function ExpandedRow({ r }: { r: WeeklyVolumeResult }) {
  return (
    <tr>
      <td colSpan={8} className="px-4 pb-4 pt-0 bg-gray-900/60">
        <div className="rounded-xl border border-gray-800 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Daily breakdown */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Daily Breakdown — Past 5 Trading Days
            </p>
            <div className="space-y-1.5">
              {r.days.map((d, i) => {
                const maxVol = Math.max(...r.days.map(x => x.volume));
                const pct    = maxVol > 0 ? (d.volume / maxVol) * 100 : 0;
                const up     = i > 0 ? d.changePct >= 0 : true;
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-gray-400 text-[11px]">{d.date}</span>
                    <span className={`w-14 text-right font-mono text-[11px] ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {i === 0 ? '' : (d.changePct >= 0 ? '+' : '')}{i === 0 ? '' : d.changePct.toFixed(1) + '%'}
                    </span>
                    {/* Volume bar */}
                    <div className="flex-1 h-2 rounded bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded transition-all ${d.volRatio >= 2 ? 'bg-orange-500' : d.volRatio >= 1.5 ? 'bg-amber-500' : 'bg-blue-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-20 text-gray-400 text-[11px] text-right">{fmt(d.volume)}</span>
                    <span className={`w-10 text-[11px] text-right font-semibold ${d.volRatio >= 2 ? 'text-orange-400' : d.volRatio >= 1.5 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {d.volRatio > 0 ? `${d.volRatio.toFixed(1)}×` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-600 mt-2">
              Bar width = % of week&apos;s peak volume.
              <span className="text-orange-500"> Orange</span> ≥ 2× ·
              <span className="text-amber-500"> Amber</span> ≥ 1.5× avg
            </p>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Week Volume"     value={fmt(r.weekVol)}                            />
            <StatCard label="Avg Week Vol"    value={fmt(r.avgWeekVol)}                          />
            <StatCard label="Vol Ratio"       value={`${r.weekVolRatio.toFixed(2)}×`}
              color={r.weekVolRatio >= 2 ? 'text-orange-400' : r.weekVolRatio >= 1.5 ? 'text-amber-400' : 'text-gray-300'}
            />
            <StatCard label="Avg Daily Vol"   value={fmt(r.avgDailyVol)}                        />
            <StatCard label="Week Price Chg"  value={`${r.weekPricePct >= 0 ? '+' : ''}${r.weekPricePct.toFixed(1)}%`}
              color={r.weekPricePct >= 0 ? 'text-emerald-400' : 'text-red-400'}
            />
            <StatCard label="Market Cap"      value={fmtCap(r.marketCapM)}                      />
          </div>

          {/* Watchlist */}
          <div className="pt-2 md:col-span-2">
            <AddToWatchlistButton symbol={r.symbol} name={r.name} />
          </div>

        </div>
      </td>
    </tr>
  );
}

function StatCard({ label, value, color = 'text-gray-200' }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-gray-900 border border-gray-800 px-3 py-2">
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct   = (score / 10) * 100;
  const color =
    score >= 8 ? 'bg-emerald-500' :
    score >= 6 ? 'bg-blue-500'    :
    score >= 4 ? 'bg-amber-500'   : 'bg-red-600';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded bg-gray-800">
        <div className={`h-full rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400">{score}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WeeklyVolumeResults({ results }: { results: WeeklyVolumeResult[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(sym: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(sym) ? next.delete(sym) : next.add(sym);
      return next;
    });
  }

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-800 p-10 text-center text-gray-600 text-sm">
        No weekly volume surges found.
      </div>
    );
  }

  return (
    <div>
      <SummaryBar results={results} />

      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left">Symbol</th>
                <th className="px-4 py-2.5 text-right">Price</th>
                <th className="px-4 py-2.5 text-right">Week %</th>
                <th className="px-4 py-2.5 text-right">Week Vol</th>
                <th className="px-4 py-2.5 text-right">Vol Ratio</th>
                <th className="px-4 py-2.5 text-right">Mkt Cap</th>
                <th className="px-4 py-2.5 text-center">Signal</th>
                <th className="px-4 py-2.5 text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => {
                const meta = SIGNAL_META[r.signal];
                const open = expanded.has(r.symbol);
                return (
                  <>
                    <tr
                      key={r.symbol}
                      onClick={() => toggle(r.symbol)}
                      className={`border-b border-gray-800/60 cursor-pointer transition-colors ${meta.row}`}
                    >
                      {/* Symbol */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/stock/${r.symbol}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="font-bold text-white hover:text-blue-400 transition-colors"
                              >
                                {r.symbol}
                              </Link>
                              <WatchlistStar symbol={r.symbol} name={r.name} />
                            </div>
                            <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{r.name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right font-mono text-white">
                        ${r.price >= 100 ? r.price.toFixed(2) : r.price.toFixed(2)}
                      </td>

                      {/* Week % change */}
                      <td className={`px-4 py-3 text-right font-semibold ${r.weekPricePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {r.weekPricePct >= 0 ? '+' : ''}{r.weekPricePct.toFixed(1)}%
                      </td>

                      {/* Week Volume */}
                      <td className="px-4 py-3 text-right text-gray-300">
                        {fmt(r.weekVol)}
                      </td>

                      {/* Volume Ratio */}
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${
                          r.weekVolRatio >= 3   ? 'text-orange-400' :
                          r.weekVolRatio >= 2   ? 'text-amber-400'  :
                          r.weekVolRatio >= 1.5 ? 'text-yellow-500' : 'text-gray-400'
                        }`}>
                          {r.weekVolRatio.toFixed(2)}×
                        </span>
                      </td>

                      {/* Market Cap */}
                      <td className="px-4 py-3 text-right text-gray-400">
                        {fmtCap(r.marketCapM)}
                      </td>

                      {/* Signal */}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <ScoreBar score={r.score} />
                          <span className="text-[10px] text-gray-600">{open ? '▲' : '▼'}</span>
                        </div>
                      </td>
                    </tr>
                    {open && <ExpandedRow key={`${r.symbol}-exp`} r={r} />}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-600">
        Scans ~6,000–8,000 US-listed stocks. Volume ratio = this week&apos;s total volume vs 3-month average weekly baseline.
        Data from Yahoo Finance. Not financial advice.
      </p>
    </div>
  );
}
