'use client';

import { useState, useEffect, useCallback } from 'react';
import type { HistoricalRow } from '@/app/api/stocks/historical/route';

// ── Types ────────────────────────────────────────────────────────────────────

type QuickRange = '1D' | '5D' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'Max' | 'Custom';
type Interval   = '1d' | '1wk' | '1mo';

const QUICK_RANGES: QuickRange[] = ['1D', '5D', '3M', '6M', 'YTD', '1Y', '5Y', 'Max', 'Custom'];

const INTERVALS: { label: string; value: Interval }[] = [
  { label: 'Daily',   value: '1d'  },
  { label: 'Weekly',  value: '1wk' },
  { label: 'Monthly', value: '1mo' },
];

// Map quick range label → Yahoo Finance range parameter
const RANGE_MAP: Record<string, string> = {
  '1D': '1d', '5D': '5d', '3M': '3mo', '6M': '6mo',
  'YTD': 'ytd', '1Y': '1y', '5Y': '5y', 'Max': 'max',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Full date — desktop */
function fmtDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  });
}

/** Short date — mobile (e.g. "Jan 01 '24") */
function fmtDateShort(ts: number): string {
  const d = new Date(ts * 1000);
  const mon = d.toLocaleDateString('en-US', { month: 'short' });
  const day = String(d.getDate()).padStart(2, '0');
  const yr  = String(d.getFullYear()).slice(2);
  return `${mon} ${day} '${yr}`;
}

function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtVol(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B';
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000)         return (v / 1_000).toFixed(1) + 'K';
  return String(v);
}

/** Return today's date as YYYY-MM-DD for the date input max attribute */
function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** Return YYYY-MM-DD for N years ago */
function yearsAgoStr(n: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().split('T')[0];
}

/** Convert YYYY-MM-DD → Unix seconds */
function toUnix(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

// ── CSV download ─────────────────────────────────────────────────────────────

function downloadCSV(rows: HistoricalRow[], symbol: string) {
  const header = ['Date', 'Type', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume', 'Amount / Ratio'];
  const lines  = rows.map((r) => [
    fmtDate(r.date),
    r.type,
    r.type === 'price' ? fmtNum(r.open)     : '',
    r.type === 'price' ? fmtNum(r.high)     : '',
    r.type === 'price' ? fmtNum(r.low)      : '',
    r.type === 'price' ? fmtNum(r.close)    : '',
    r.type === 'price' ? fmtNum(r.adjClose) : '',
    r.type === 'price' ? fmtVol(r.volume)   : '',
    r.type === 'dividend' ? `$${r.amount?.toFixed(4)}` : r.type === 'split' ? r.ratio : '',
  ].join(','));

  const csv  = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${symbol}_historical.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ────────────────────────────────────────────────────────────

export function HistoricalDataTable({ symbol }: { symbol: string }) {
  const [open, setOpen]               = useState(false);
  const [range, setRange]             = useState<QuickRange>('1Y');
  const [interval, setInterval]       = useState<Interval>('1d');
  const [startDate, setStartDate]     = useState(yearsAgoStr(1));
  const [endDate, setEndDate]         = useState(todayStr());
  const [showDividends, setShowDiv]   = useState(true);
  const [showSplits, setShowSplits]   = useState(true);
  const [rows, setRows]               = useState<HistoricalRow[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ symbol, interval });

    if (range === 'Custom') {
      if (!startDate || !endDate) { setLoading(false); return; }
      params.set('from', String(toUnix(startDate)));
      params.set('to',   String(toUnix(endDate) + 86400)); // inclusive end
    } else {
      params.set('range', RANGE_MAP[range]);
    }

    try {
      const res  = await fetch(`/api/stocks/historical?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      setRows(json.rows ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [symbol, range, interval, startDate, endDate]);

  // Fetch whenever panel is opened or settings change
  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  // Filter rows based on toggle state
  const visibleRows = rows.filter((r) => {
    if (r.type === 'dividend' && !showDividends) return false;
    if (r.type === 'split'    && !showSplits)    return false;
    return true;
  });

  const dividendCount = rows.filter((r) => r.type === 'dividend').length;
  const splitCount    = rows.filter((r) => r.type === 'split').length;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
      {/* ── Section header / toggle ─────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-900/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Table icon */}
          <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 10h18M3 6h18M3 14h18M3 18h18" />
          </svg>
          <span className="text-sm font-semibold text-gray-200">Historical Data</span>
          <span className="text-xs text-gray-500">Prices · Dividends · Splits</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Expanded content ────────────────────────────────────────────────── */}
      {open && (
        <div className="border-t border-gray-800">

          {/* Controls bar */}
          <div className="px-4 py-3 space-y-3 border-b border-gray-800 bg-gray-900/40">

            {/* Row 1: Quick ranges + interval */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick range pills */}
              <div className="flex flex-wrap items-center gap-1 bg-gray-900 rounded-lg p-0.5 border border-gray-800">
                {QUICK_RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      range === r
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Separator */}
              <div className="h-5 w-px bg-gray-700 hidden sm:block" />

              {/* Frequency */}
              <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-0.5 border border-gray-800">
                {INTERVALS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setInterval(value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      interval === value
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Custom date pickers (only when Custom selected) */}
            {range === 'Custom' && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 whitespace-nowrap">Start</label>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 whitespace-nowrap">End</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={todayStr()}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={fetchData}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                >
                  Apply
                </button>
              </div>
            )}

            {/* Row 3: Toggles + download */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Dividend toggle */}
              {dividendCount > 0 && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setShowDiv((v) => !v)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${showDividends ? 'bg-amber-500' : 'bg-gray-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${showDividends ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-xs text-gray-400">
                    Dividends <span className="text-amber-400">({dividendCount})</span>
                  </span>
                </label>
              )}

              {/* Splits toggle */}
              {splitCount > 0 && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setShowSplits((v) => !v)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${showSplits ? 'bg-purple-500' : 'bg-gray-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${showSplits ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-xs text-gray-400">
                    Splits <span className="text-purple-400">({splitCount})</span>
                  </span>
                </label>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Row count */}
              {!loading && rows.length > 0 && (
                <span className="text-xs text-gray-500">
                  {visibleRows.length.toLocaleString()} row{visibleRows.length !== 1 ? 's' : ''}
                </span>
              )}

              {/* Download CSV */}
              {visibleRows.length > 0 && (
                <button
                  onClick={() => downloadCSV(visibleRows, symbol)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CSV
                </button>
              )}
            </div>
          </div>

          {/* ── Table ─────────────────────────────────────────────────────────── */}
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-16 text-gray-500 text-sm gap-3">
                <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Loading historical data…
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-12 text-red-400 text-sm gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {!loading && !error && visibleRows.length === 0 && (
              <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
                No data available for the selected range.
              </div>
            )}

            {!loading && !error && visibleRows.length > 0 && (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-900 z-20 border-b border-gray-800">
                  <tr>
                    {/* Frozen Date header */}
                    <th className="sticky left-0 z-30 bg-gray-900 text-left px-2 sm:px-4 py-2.5 text-gray-400 font-medium whitespace-nowrap border-r border-gray-700/60 text-[10px] sm:text-xs">
                      Date
                    </th>
                    <th className="text-right px-2 sm:px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap text-[10px] sm:text-xs">Open</th>
                    <th className="text-right px-2 sm:px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap text-[10px] sm:text-xs">High</th>
                    <th className="text-right px-2 sm:px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap text-[10px] sm:text-xs">Low</th>
                    <th className="text-right px-2 sm:px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap text-[10px] sm:text-xs">Close</th>
                    <th className="text-right px-2 sm:px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap text-[10px] sm:text-xs">Adj Close</th>
                    <th className="text-right px-2 sm:px-4 py-2.5 text-gray-400 font-medium whitespace-nowrap text-[10px] sm:text-xs">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {visibleRows.map((row, idx) => {
                    if (row.type === 'dividend') {
                      return (
                        <tr key={`div-${row.date}-${idx}`} className="bg-amber-950/20 hover:bg-amber-950/30 transition-colors">
                          {/* Frozen date cell */}
                          <td className="sticky left-0 z-10 bg-[#1a1000] px-2 sm:px-4 py-2 whitespace-nowrap border-r border-gray-700/40">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                DIV
                              </span>
                              <span className="text-gray-300">
                                <span className="sm:hidden">{fmtDateShort(row.date)}</span>
                                <span className="hidden sm:inline">{fmtDate(row.date)}</span>
                              </span>
                            </div>
                          </td>
                          <td colSpan={5} className="px-2 sm:px-3 py-2 text-amber-300 text-center font-medium">
                            <span className="sm:hidden">${row.amount?.toFixed(3)}/sh</span>
                            <span className="hidden sm:inline">Dividend — ${row.amount?.toFixed(4)} per share</span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 text-gray-600 text-right">—</td>
                        </tr>
                      );
                    }

                    if (row.type === 'split') {
                      return (
                        <tr key={`split-${row.date}-${idx}`} className="bg-purple-950/20 hover:bg-purple-950/30 transition-colors">
                          {/* Frozen date cell */}
                          <td className="sticky left-0 z-10 bg-[#110a1a] px-2 sm:px-4 py-2 whitespace-nowrap border-r border-gray-700/40">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                SPLIT
                              </span>
                              <span className="text-gray-300">
                                <span className="sm:hidden">{fmtDateShort(row.date)}</span>
                                <span className="hidden sm:inline">{fmtDate(row.date)}</span>
                              </span>
                            </div>
                          </td>
                          <td colSpan={5} className="px-2 sm:px-3 py-2 text-purple-300 text-center font-medium">
                            <span className="sm:hidden">{row.ratio}</span>
                            <span className="hidden sm:inline">Stock Split — {row.ratio}</span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 text-gray-600 text-right">—</td>
                        </tr>
                      );
                    }

                    // Price row
                    const isUp = (row.close ?? 0) >= (row.open ?? 0);
                    return (
                      <tr key={`price-${row.date}-${idx}`} className="hover:bg-gray-800/40 transition-colors group">
                        {/* Frozen date cell — transitions with row hover */}
                        <td className="sticky left-0 z-10 bg-gray-950 group-hover:bg-gray-900 transition-colors px-2 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap font-medium border-r border-gray-700/40 text-gray-400">
                          <span className="sm:hidden">{fmtDateShort(row.date)}</span>
                          <span className="hidden sm:inline">{fmtDate(row.date)}</span>
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-gray-300 font-mono tabular-nums">
                          {fmtNum(row.open)}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-emerald-400 font-mono tabular-nums">
                          {fmtNum(row.high)}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-red-400 font-mono tabular-nums">
                          {fmtNum(row.low)}
                        </td>
                        <td className={`px-2 sm:px-3 py-1.5 sm:py-2 text-right font-mono tabular-nums font-semibold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                          {fmtNum(row.close)}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-gray-400 font-mono tabular-nums">
                          {fmtNum(row.adjClose)}
                        </td>
                        <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-right text-gray-400 font-mono tabular-nums">
                          {fmtVol(row.volume)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer note */}
          {!loading && !error && visibleRows.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-800 text-[11px] text-gray-600">
              * Adj Close adjusted for dividends and splits. Data sourced from Yahoo Finance.
              Prices shown in the stock&apos;s trading currency.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
