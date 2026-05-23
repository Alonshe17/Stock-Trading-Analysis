'use client';

import Link from 'next/link';
import { useState } from 'react';
import { WatchlistStar } from '@/components/trading/WatchlistStar';
import { AddToWatchlistButton } from '@/components/trading/AddToWatchlistButton';
import type { DayBuyVolumeResult, DayBuySignal } from '@/lib/dayBuyVolumeScanner';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

// ── Signal styling ─────────────────────────────────────────────────────────────

const SIGNAL_META: Record<DayBuySignal, {
  label: string; badge: string; dot: string; row: string;
}> = {
  'strong-buy': { label: '🔥 Strong Buy Vol',  badge: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50', dot: 'bg-emerald-400', row: 'hover:bg-emerald-950/30' },
  'buy-surge':  { label: '↑ Buy Vol Surge',    badge: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40', dot: 'bg-emerald-600', row: 'hover:bg-emerald-950/20' },
  'vol-surge':  { label: '📊 Vol Surge',        badge: 'bg-amber-900/30 text-amber-400 border-amber-700/40',       dot: 'bg-amber-500',  row: 'hover:bg-amber-950/20'   },
};

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ results }: { results: DayBuyVolumeResult[] }) {
  const counts: Partial<Record<DayBuySignal, number>> = {};
  for (const r of results) counts[r.signal] = (counts[r.signal] ?? 0) + 1;

  // Derive comparison label from the first result (all results share the same dates)
  const first = results[0];
  const compLabel = first ? `${first.endDateLabel} vs ${first.startDateLabel}` : '';

  const items: { signal: DayBuySignal; label: string; badge: string }[] = [
    { signal: 'strong-buy', label: '🔥 Strong Buy Vol', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { signal: 'buy-surge',  label: '↑ Buy Vol Surge',   badge: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' },
    { signal: 'vol-surge',  label: '📊 Vol Surge',       badge: 'bg-amber-900/30 text-amber-400 border-amber-700/40'      },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {items.map(({ signal, label, badge }) => (
        <span key={signal} className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold ${badge}`}>
          {label} <span className="opacity-70">{counts[signal] ?? 0}</span>
        </span>
      ))}
      {compLabel && (
        <span className="px-3 py-1.5 rounded-full border border-blue-700/40 bg-blue-900/20 text-blue-400 text-[11px] font-semibold">
          📅 {compLabel}
        </span>
      )}
      <span className="px-3 py-1.5 rounded-full border border-gray-700/40 bg-gray-800 text-gray-400 text-[11px] font-semibold ml-auto">
        {results.length} stocks
      </span>
    </div>
  );
}

// ── Buy pressure bar ──────────────────────────────────────────────────────────

function BuyPressureBar({ frac, label }: { frac: number; label: string }) {
  const buyPct  = Math.round(frac * 100);
  const sellPct = 100 - buyPct;
  return (
    <div>
      <p className="text-[10px] text-gray-500 mb-1">{label}</p>
      <div className="flex h-4 rounded overflow-hidden text-[10px] font-semibold">
        <div
          className="bg-emerald-600 flex items-center justify-center text-white"
          style={{ width: `${buyPct}%` }}
        >
          {buyPct >= 20 ? `${buyPct}%` : ''}
        </div>
        <div
          className="bg-red-800 flex items-center justify-center text-red-200"
          style={{ width: `${sellPct}%` }}
        >
          {sellPct >= 20 ? `${sellPct}%` : ''}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
        <span className="text-emerald-600">Buy {buyPct}%</span>
        <span className="text-red-700">Sell {sellPct}%</span>
      </div>
    </div>
  );
}

// ── Expanded row ──────────────────────────────────────────────────────────────

function ExpandedRow({ r }: { r: DayBuyVolumeResult }) {
  return (
    <tr>
      <td colSpan={9} className="px-4 pb-4 pt-0 bg-gray-900/60">
        <div className="rounded-xl border border-gray-800 p-4 grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Buy/Sell pressure comparison */}
          <div className="space-y-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Buying Pressure — {r.endDateLabel} vs {r.startDateLabel}
            </p>
            <BuyPressureBar frac={r.todayBuyFrac} label={r.endDateLabel} />
            <BuyPressureBar frac={r.prevBuyFrac}  label={r.startDateLabel} />
            <div className="flex gap-3 text-xs">
              <div className="flex-1 rounded-lg bg-gray-900 border border-gray-800 px-3 py-2">
                <p className="text-[10px] text-gray-500 mb-0.5">Vol {r.endDateLabel}</p>
                <p className="text-emerald-400 font-semibold">{fmt(r.volume)}</p>
                <p className="text-[9px] text-gray-600 mt-0.5">Buy est. {fmt(r.todayBuyVol)}</p>
              </div>
              <div className="flex-1 rounded-lg bg-gray-900 border border-gray-800 px-3 py-2">
                <p className="text-[10px] text-gray-500 mb-0.5">Vol {r.startDateLabel}</p>
                <p className="text-gray-300 font-semibold">{fmt(r.prevVolume)}</p>
                <p className="text-[9px] text-gray-600 mt-0.5">Buy est. {fmt(r.prevBuyVol)}</p>
              </div>
              <div className="flex-1 rounded-lg bg-gray-900 border border-gray-800 px-3 py-2">
                <p className="text-[10px] text-gray-500 mb-0.5">Total Vol Ratio</p>
                <p className={`font-bold ${r.totalVolRatio >= 3 ? 'text-orange-400' : 'text-amber-400'}`}>
                  {r.totalVolRatio.toFixed(2)}×
                </p>
                {r.signal !== 'vol-surge' && (
                  <p className="text-[9px] text-gray-600 mt-0.5">Buy ratio {r.buyVolRatio.toFixed(2)}×</p>
                )}
              </div>
            </div>
          </div>

          {/* OHLCV details */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Bar Details
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* End date bar */}
              <div className="rounded-lg bg-gray-900 border border-emerald-800/40 px-3 py-2">
                <p className="text-[10px] text-emerald-600 font-semibold mb-1 uppercase">{r.endDateLabel}</p>
                <div className="space-y-0.5 text-gray-400">
                  <div className="flex justify-between"><span>Open</span><span className="text-white">${r.todayOpen.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>High</span><span className="text-emerald-400">${r.todayHigh.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Low</span><span className="text-red-400">${r.todayLow.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Close</span><span className="text-white font-semibold">${r.todayClose.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Volume</span><span className="text-gray-300">{fmt(r.volume)}</span></div>
                </div>
              </div>
              {/* Start date bar */}
              <div className="rounded-lg bg-gray-900 border border-gray-800 px-3 py-2">
                <p className="text-[10px] text-gray-500 font-semibold mb-1 uppercase">{r.startDateLabel}</p>
                <div className="space-y-0.5 text-gray-400">
                  <div className="flex justify-between"><span>Open</span><span className="text-white">${r.prevOpen.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>High</span><span className="text-emerald-400">${r.prevHigh.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Low</span><span className="text-red-400">${r.prevLow.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Close</span><span className="text-white font-semibold">${r.prevClose.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Volume</span><span className="text-gray-300">{fmt(r.prevVolume)}</span></div>
                </div>
              </div>
            </div>

            {/* Avg volume context */}
            <div className="rounded-lg bg-gray-900 border border-gray-800 px-3 py-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">3m Avg Daily Vol</span>
                <span className="text-gray-300">{fmt(r.avgVolume)}</span>
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-gray-500">Today Vol Ratio</span>
                <span className={`font-semibold ${r.volRatio >= 2 ? 'text-orange-400' : r.volRatio >= 1.5 ? 'text-amber-400' : 'text-gray-300'}`}>
                  {r.volRatio.toFixed(2)}×
                </span>
              </div>
            </div>

            {/* Full analysis link */}
            <div className="flex items-center gap-3 pt-1">
              <AddToWatchlistButton symbol={r.symbol} name={r.name} />
              <Link
                href={`/stock/${r.symbol}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-blue-400 hover:text-blue-300 text-xs transition"
              >
                Full Analysis →
              </Link>
            </div>
          </div>
        </div>
      </td>
    </tr>
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

export function DayBuyVolumeResults({ results }: { results: DayBuyVolumeResult[] }) {
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
        No stocks found with a significant buying volume jump today.
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
                <th className="px-4 py-2.5 text-right">
                  <span className="text-gray-500">Chg%</span>
                  <div className="text-[9px] font-normal text-gray-600 normal-case">info only</div>
                </th>
                <th className="px-4 py-2.5 text-right">Vol (end)</th>
                <th className="px-4 py-2.5 text-right">vs Avg</th>
                <th className="px-4 py-2.5 text-right">Vol Jump</th>
                <th className="px-4 py-2.5 text-right">Buy Pressure</th>
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
                        ${r.price.toFixed(2)}
                      </td>

                      {/* Change % */}
                      <td className={`px-4 py-3 text-right font-semibold ${r.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {r.changePct >= 0 ? '+' : ''}{r.changePct.toFixed(2)}%
                      </td>

                      {/* Total volume today */}
                      <td className="px-4 py-3 text-right text-gray-300">
                        {fmt(r.volume)}
                      </td>

                      {/* Vol ratio (today / avg) */}
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${
                          r.volRatio >= 3   ? 'text-orange-400' :
                          r.volRatio >= 2   ? 'text-amber-400'  :
                          r.volRatio >= 1.5 ? 'text-yellow-500' : 'text-gray-400'
                        }`}>
                          {r.volRatio.toFixed(2)}×
                        </span>
                      </td>

                      {/* Vol Jump — shows whichever metric is higher: total vol ratio or buy vol ratio */}
                      <td className="px-4 py-3 text-right">
                        {(() => {
                          const metric = Math.max(r.totalVolRatio, r.buyVolRatio);
                          const isBuy  = r.buyVolRatio >= r.totalVolRatio;
                          return (
                            <div>
                              <span className={`font-bold text-base ${
                                metric >= 5 ? 'text-orange-300' :
                                metric >= 3 ? 'text-orange-400' :
                                'text-amber-400'
                              }`}>
                                {metric.toFixed(1)}×
                              </span>
                              <div className="text-[9px] text-gray-600">{isBuy ? 'buy vol' : 'total vol'}</div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Buy pressure today (buy fraction as %) */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 rounded bg-gray-800 overflow-hidden">
                            <div
                              className="h-full rounded bg-emerald-600"
                              style={{ width: `${Math.round(r.todayBuyFrac * 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold w-8 text-right ${
                            r.todayBuyFrac >= 0.65 ? 'text-emerald-400' :
                            r.todayBuyFrac >= 0.5  ? 'text-gray-300'    : 'text-red-400'
                          }`}>
                            {Math.round(r.todayBuyFrac * 100)}%
                          </span>
                        </div>
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
        Sorted by biggest volume jump — price change is shown for reference only, not used for ranking.
        Buying volume estimated via Closing Price Location: <span className="font-mono">buyVol = totalVol × (close − low) / (high − low)</span>.{' '}
        <span className="text-amber-700">📊 Vol Surge</span> = total volume jumped ≥ 2× (matches TradingView volume bars).
        Price ≥ $10, min end-date volume 200K. Not financial advice.
      </p>
    </div>
  );
}
