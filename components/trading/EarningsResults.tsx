'use client';

import Link from 'next/link';
import { WatchlistStar } from '@/components/trading/WatchlistStar';
import type { EarningsResult, EarningsTimeOfDay } from '@/lib/earningsScanner';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCap(m: number): string {
  if (m >= 1_000_000) return `$${(m / 1_000_000).toFixed(1)}T`;
  if (m >= 1_000)     return `$${(m / 1_000).toFixed(0)}B`;
  if (m > 0)          return `$${m.toFixed(0)}M`;
  return '—';
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n > 0 ? n.toFixed(0) : '—';
}

// ── Time-of-day badge ─────────────────────────────────────────────────────────

const TIME_META: Record<EarningsTimeOfDay, { label: string; badge: string; title: string }> = {
  BMO: { label: 'BMO', badge: 'bg-blue-900/40 text-blue-300 border-blue-700/40',     title: 'Before Market Open'  },
  AMC: { label: 'AMC', badge: 'bg-purple-900/40 text-purple-300 border-purple-700/40', title: 'After Market Close' },
  TNS: { label: '?',   badge: 'bg-gray-800 text-gray-500 border-gray-700/40',         title: 'Time Not Specified'  },
};

// ── Urgency styling ───────────────────────────────────────────────────────────

function urgencyClass(daysUntil: number): string {
  if (daysUntil === 0) return 'text-red-400 font-bold';
  if (daysUntil <= 3)  return 'text-orange-400 font-semibold';
  if (daysUntil <= 7)  return 'text-amber-400';
  return 'text-gray-400';
}

function urgencyLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil}d`;
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ results, startDate }: { results: EarningsResult[]; startDate: string }) {
  const endDate = new Date(startDate + 'T00:00:00Z');
  endDate.setUTCDate(endDate.getUTCDate() + 30);
  const endLabel = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  const today   = results.filter(r => r.daysUntil === 0).length;
  const week    = results.filter(r => r.daysUntil > 0 && r.daysUntil <= 7).length;
  const rest    = results.filter(r => r.daysUntil > 7).length;
  const uniqueDates = new Set(results.map(r => r.earningsDate)).size;

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-center">
      {today > 0 && (
        <span className="px-3 py-1.5 rounded-full border border-red-700/40 bg-red-900/20 text-red-400 text-[11px] font-semibold">
          🔴 Today — {today} stock{today !== 1 ? 's' : ''}
        </span>
      )}
      {week > 0 && (
        <span className="px-3 py-1.5 rounded-full border border-orange-700/40 bg-orange-900/20 text-orange-400 text-[11px] font-semibold">
          🟠 This Week — {week} stock{week !== 1 ? 's' : ''}
        </span>
      )}
      {rest > 0 && (
        <span className="px-3 py-1.5 rounded-full border border-gray-700/40 bg-gray-800 text-gray-400 text-[11px] font-semibold">
          📅 Later — {rest} stock{rest !== 1 ? 's' : ''}
        </span>
      )}
      <span className="px-3 py-1.5 rounded-full border border-blue-700/40 bg-blue-900/20 text-blue-400 text-[11px] font-semibold">
        📆 {startDate} → {endLabel} · {uniqueDates} day{uniqueDates !== 1 ? 's' : ''} with earnings
      </span>
      <span className="px-3 py-1.5 rounded-full border border-gray-700/40 bg-gray-800 text-gray-400 text-[11px] font-semibold ml-auto">
        {results.length} stocks
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EarningsResults({
  results,
  startDate,
}: {
  results: EarningsResult[];
  startDate: string;
}) {
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-800 p-10 text-center text-gray-600 text-sm">
        No upcoming earnings found for this date range.
      </div>
    );
  }

  // Group by date
  const groups = new Map<string, EarningsResult[]>();
  for (const r of results) {
    if (!groups.has(r.earningsDate)) groups.set(r.earningsDate, []);
    groups.get(r.earningsDate)!.push(r);
  }

  return (
    <div>
      <SummaryBar results={results} startDate={startDate} />

      <div className="space-y-6">
        {[...groups.entries()].map(([date, stocks]) => {
          const first      = stocks[0];
          const urgency    = first.daysUntil;
          const headerColor =
            urgency === 0 ? 'border-red-700/50 bg-red-950/20' :
            urgency <= 3  ? 'border-orange-700/50 bg-orange-950/20' :
            urgency <= 7  ? 'border-amber-700/50 bg-amber-950/20' :
            'border-gray-700/50 bg-gray-900/40';

          return (
            <div key={date} className="rounded-xl border border-gray-800 overflow-hidden">
              {/* Date header */}
              <div className={`flex items-center gap-3 px-4 py-2.5 border-b ${headerColor}`}>
                <span className="text-sm font-bold text-white">{first.earningsDateLabel}</span>
                <span className={`text-xs font-semibold ${urgencyClass(urgency)}`}>
                  {urgencyLabel(urgency)}
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                  {stocks.length} stock{stocks.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Stocks table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-900/60 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="px-4 py-2 text-left">Symbol</th>
                      <th className="px-4 py-2 text-center">Time</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Chg%</th>
                      <th className="px-4 py-2 text-right">Volume</th>
                      <th className="px-4 py-2 text-right">Mkt Cap</th>
                      <th className="px-4 py-2 text-right">Fwd EPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map(r => {
                      const tm = TIME_META[r.timeOfDay];
                      return (
                        <tr
                          key={r.symbol}
                          className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors"
                        >
                          {/* Symbol */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <Link
                                    href={`/stock/${r.symbol}`}
                                    className="font-bold text-white hover:text-blue-400 transition-colors"
                                  >
                                    {r.symbol}
                                  </Link>
                                  <WatchlistStar symbol={r.symbol} name={r.name} />
                                </div>
                                <div className="text-[10px] text-gray-500 truncate max-w-[160px]">
                                  {r.name}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Time of day */}
                          <td className="px-4 py-3 text-center">
                            <span
                              title={tm.title}
                              className={`px-2 py-0.5 rounded border text-[10px] font-bold ${tm.badge}`}
                            >
                              {tm.label}
                            </span>
                          </td>

                          {/* Price */}
                          <td className="px-4 py-3 text-right font-mono text-white">
                            {r.price > 0 ? `$${r.price.toFixed(2)}` : '—'}
                          </td>

                          {/* Change % */}
                          <td className={`px-4 py-3 text-right font-semibold text-sm ${
                            r.changePct > 0 ? 'text-emerald-400' :
                            r.changePct < 0 ? 'text-red-400' : 'text-gray-500'
                          }`}>
                            {r.changePct !== 0
                              ? `${r.changePct >= 0 ? '+' : ''}${r.changePct.toFixed(2)}%`
                              : '—'}
                          </td>

                          {/* Volume */}
                          <td className="px-4 py-3 text-right text-gray-300 text-xs">
                            {fmtVol(r.volume)}
                          </td>

                          {/* Market Cap */}
                          <td className="px-4 py-3 text-right text-gray-300 text-xs">
                            {fmtCap(r.marketCapM)}
                          </td>

                          {/* EPS Estimate */}
                          <td className="px-4 py-3 text-right">
                            {r.epsEstimate !== null ? (
                              <span className={`text-xs font-semibold ${
                                r.epsEstimate > 0 ? 'text-emerald-400' :
                                r.epsEstimate < 0 ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                {r.epsEstimate >= 0 ? '+' : ''}${r.epsEstimate.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-600">
        Earnings dates from Yahoo Finance. Dates may shift — always verify before trading.
        BMO = Before Market Open · AMC = After Market Close · ? = Time Not Specified.
        Fwd EPS = forward annual EPS estimate (proxy only — not the quarterly estimate).
        Sorted by date (soonest first), then market cap within each date.
        Covers top ~5 000 US stocks by market cap.
        Not financial advice.
      </p>
    </div>
  );
}
