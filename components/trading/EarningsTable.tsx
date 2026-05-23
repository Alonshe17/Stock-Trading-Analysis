'use client';

import { useEffect, useState } from 'react';
import type { EarningsTableRow, UpcomingEarnings } from '@/app/api/stocks/revenue/route';

function fmtRevenue(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(2)}B`;
  return `$${v.toFixed(0)}M`;
}

function fmtPct(v: number | null, decimals = 2): string {
  if (v === null) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(decimals) + '%';
}

function colorPct(v: number | null): string {
  if (v === null) return 'text-gray-500';
  return v >= 0 ? 'text-emerald-400' : 'text-red-400';
}

// Sticky first column shared classes
const stickyTh = 'sticky left-0 z-20 bg-gray-950 text-left px-4 py-2.5 font-medium whitespace-nowrap';
const stickyTdBase = 'sticky left-0 z-10 px-4 py-3 font-semibold whitespace-nowrap after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-gray-800';

export function EarningsTable({ symbol }: { symbol: string }) {
  const [rows, setRows]         = useState<EarningsTableRow[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingEarnings | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stocks/revenue?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.earningsTable?.length) setRows(d.earningsTable);
        if (d?.upcomingEarnings)      setUpcoming(d.upcomingEarnings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="border border-gray-800 bg-gray-950 rounded-xl p-4 animate-pulse">
        <div className="h-3 w-40 bg-gray-800 rounded mb-4" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="h-9 bg-gray-900 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!rows.length && !upcoming) return null;

  return (
    <div className="border border-gray-800 bg-gray-950 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-800 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
          Quarterly Earnings History
        </span>
        {upcoming && (
          <span className="ml-auto text-[10px] text-amber-400 bg-amber-900/20 border border-amber-800/40 px-2 py-0.5 rounded-full whitespace-nowrap">
            Next earnings: {upcoming.date}{upcoming.isEstimate ? ' (est.)' : ''}
          </span>
        )}
      </div>

      {/* Scrollable table — min-w forces horizontal scroll on mobile */}
      <div className="overflow-x-auto w-full">
        <table className="text-xs" style={{ minWidth: 640, width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr className="border-b border-gray-800 text-gray-500">
              {/* Sticky Quarter header */}
              <th className={stickyTh}>Quarter</th>
              <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Date</th>
              <th className="text-right px-4 py-2.5 font-medium whitespace-nowrap">Revenue</th>
              <th className="text-right px-4 py-2.5 font-medium whitespace-nowrap">Rev YoY</th>
              <th className="text-right px-4 py-2.5 font-medium whitespace-nowrap">Net Income</th>
              <th className="text-right px-4 py-2.5 font-medium whitespace-nowrap">EPS Est</th>
              <th className="text-right px-4 py-2.5 font-medium whitespace-nowrap">EPS Actual</th>
              <th className="text-right px-4 py-2.5 font-medium whitespace-nowrap">EPS Surprise</th>
            </tr>
          </thead>
          <tbody>

            {/* Upcoming earnings row */}
            {upcoming && (
              <tr className="border-b border-amber-800/30">
                {/* Sticky Quarter cell */}
                <td className={`${stickyTdBase} bg-amber-900/10 text-amber-300`}>
                  Upcoming
                  <span className="ml-1.5 text-[9px] text-amber-400 font-medium bg-amber-900/40 px-1.5 py-0.5 rounded">
                    {upcoming.isEstimate ? 'Est.' : 'Confirmed'}
                  </span>
                </td>
                <td className="px-4 py-3 text-left text-amber-400/80 whitespace-nowrap font-medium bg-amber-900/10">
                  {upcoming.date}
                </td>
                <td className="px-4 py-3 text-right text-amber-400/70 tabular-nums bg-amber-900/10">
                  {upcoming.revenueEstimateM != null ? fmtRevenue(upcoming.revenueEstimateM) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-gray-600 bg-amber-900/10">—</td>
                <td className="px-4 py-3 text-right text-gray-600 bg-amber-900/10">—</td>
                <td className="px-4 py-3 text-right text-amber-400/70 tabular-nums bg-amber-900/10">
                  {upcoming.epsEstimate != null ? `$${upcoming.epsEstimate.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-right text-gray-600 bg-amber-900/10">—</td>
                <td className="px-4 py-3 text-right text-gray-600 bg-amber-900/10">—</td>
              </tr>
            )}

            {rows.map((row, i) => {
              const rowBg = i === 0 ? 'bg-gray-900/20' : 'bg-gray-950';
              return (
                <tr
                  key={row.quarterLabel}
                  className="border-b border-gray-800/60 last:border-0 transition-colors hover:bg-gray-900/40"
                >
                  {/* Sticky Quarter cell */}
                  <td className={`${stickyTdBase} ${rowBg} text-gray-200`}>
                    {row.quarterLabel}
                    {i === 0 && (
                      <span className="ml-1.5 text-[9px] text-violet-400 font-medium bg-violet-900/30 px-1.5 py-0.5 rounded">
                        Latest
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-left text-gray-400 whitespace-nowrap">
                    {row.reportDate}
                  </td>

                  <td className="px-4 py-3 text-right font-medium text-gray-200 tabular-nums">
                    {row.revenueM > 0 ? fmtRevenue(row.revenueM) : '—'}
                  </td>

                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${colorPct(row.revenueYoyPct)}`}>
                    {fmtPct(row.revenueYoyPct, 1)}
                  </td>

                  <td className="px-4 py-3 text-right text-gray-400 tabular-nums">
                    {row.netIncomeM !== null ? fmtRevenue(row.netIncomeM) : '—'}
                  </td>

                  <td className="px-4 py-3 text-right text-gray-400 tabular-nums">
                    ${row.epsEstimate.toFixed(2)}
                  </td>

                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                    row.epsActual >= row.epsEstimate ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    ${row.epsActual.toFixed(2)}
                  </td>

                  <td className={`px-4 py-3 text-right font-bold tabular-nums ${colorPct(row.epsSurprisePct)}`}>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                      row.epsSurprisePct >= 0
                        ? 'bg-emerald-900/40 text-emerald-400'
                        : 'bg-red-900/40 text-red-400'
                    }`}>
                      {row.epsSurprisePct >= 0 ? '▲' : '▼'}
                      {fmtPct(row.epsSurprisePct)}
                    </span>
                  </td>
                </tr>
              );
            })}

          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 text-[10px] text-gray-700 border-t border-gray-800/50">
        Source: Yahoo Finance · EPS surprise = actual vs analyst consensus estimate
        {upcoming && <span className="ml-2">· Revenue estimate = analyst consensus</span>}
      </div>
    </div>
  );
}
