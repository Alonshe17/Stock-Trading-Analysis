'use client';

import Link from 'next/link';
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { ScreenerEntry } from '@/lib/screener';
import { SignalBadge } from './SignalBadge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import type { Signal } from '@/lib/analysis';

const STORAGE_KEY = 'swingmonitor_watchlist';

type SortKey = 'signal' | 'minerviniScore' | 'rsi' | 'atrPct' | 'distanceFromHigh' | 'avgVolume' | 'price' | 'ema8';
type FilterSignal = Signal | 'ALL';

const TV_RATINGS = ['Strong Buy', 'Buy', 'Neutral', 'Sell', 'Strong Sell'];
const SIGNAL_ORDER: Record<string, number> = { BREAKOUT: 0, PULLBACK: 1, MEAN_REVERT: 2, WATCH: 3, AVOID: 4, NEUTRAL: 5 };

export function ScreenerTable({ entries }: { entries: ScreenerEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('signal');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterSignal, setFilterSignal] = useState<FilterSignal>('ALL');

  // Search / filter state
  const [symbolSearch, setSymbolSearch]     = useState('');
  const [tvRatingFilter, setTvRatingFilter] = useState('');
  const [sectorSearch, setSectorSearch]     = useState('');

  // Start with empty state on both server + client to avoid hydration mismatch.
  // Populate from localStorage only after mount (client-side only).
  const [added, setAdded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const list: { symbol: string }[] = JSON.parse(saved);
      setAdded(Object.fromEntries(list.map((w) => [w.symbol, true])));
    } catch { /* ignore */ }
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'signal' || key === 'minerviniScore' ? 'asc' : 'desc');
    }
  }

  function clearFilters() {
    setSymbolSearch('');
    setTvRatingFilter('');
    setSectorSearch('');
  }

  const hasActiveFilters = symbolSearch !== '' || tvRatingFilter !== '' || sectorSearch !== '';

  const addToWatchlist = useCallback((entry: ScreenerEntry) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const list: { symbol: string; name: string; type: string }[] = saved ? JSON.parse(saved) : [];
      if (list.some((w) => w.symbol === entry.symbol)) return;
      list.push({ symbol: entry.symbol, name: entry.name, type: 'stock' });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      setAdded((prev) => ({ ...prev, [entry.symbol]: true }));
    } catch { /* ignore */ }
  }, []);

  // Unique sorted sectors for the datalist
  const uniqueSectors = useMemo(() => {
    const s = new Set(entries.map((e) => e.sector).filter(Boolean));
    return Array.from(s).sort();
  }, [entries]);

  const allSignals: FilterSignal[] = ['ALL', 'BREAKOUT', 'PULLBACK', 'MEAN_REVERT', 'WATCH', 'AVOID', 'NEUTRAL'];
  const signalCounts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.signal] = (acc[e.signal] ?? 0) + 1;
    return acc;
  }, {});

  // Apply all filters in sequence
  const filtered = useMemo(() => {
    let rows = filterSignal === 'ALL' ? entries : entries.filter((e) => e.signal === filterSignal);

    if (symbolSearch.trim()) {
      const q = symbolSearch.trim().toUpperCase();
      rows = rows.filter(
        (e) => e.symbol.toUpperCase().includes(q) || e.name.toUpperCase().includes(q),
      );
    }
    if (tvRatingFilter) {
      rows = rows.filter((e) => e.tvRating === tvRatingFilter);
    }
    if (sectorSearch.trim()) {
      const q = sectorSearch.trim().toLowerCase();
      rows = rows.filter((e) => (e.sector ?? '').toLowerCase().includes(q));
    }

    return rows;
  }, [entries, filterSignal, symbolSearch, tvRatingFilter, sectorSearch]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === 'signal') {
        av = SIGNAL_ORDER[a.signal] ?? 9;
        bv = SIGNAL_ORDER[b.signal] ?? 9;
      } else {
        av = a[sortKey] as number;
        bv = b[sortKey] as number;
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [filtered, sortKey, sortDir]);

  return (
    <div>
      {/* Signal filter pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {allSignals.map((sig) => {
          const count = sig === 'ALL' ? entries.length : (signalCounts[sig] ?? 0);
          const active = filterSignal === sig;
          return (
            <button
              key={sig}
              onClick={() => setFilterSignal(sig)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                active
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              {sig === 'ALL' ? 'All' : sig.replace('_', ' ')}
              <span className={`ml-1.5 ${active ? 'text-blue-200' : 'text-gray-600'}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Search filters row */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Symbol search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Symbol or name…"
            value={symbolSearch}
            onChange={(e) => setSymbolSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-44"
          />
        </div>

        {/* TV Rating dropdown */}
        <select
          value={tvRatingFilter}
          onChange={(e) => setTvRatingFilter(e.target.value)}
          className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-blue-500 w-36 appearance-none cursor-pointer"
        >
          <option value="">All TV Ratings</option>
          {TV_RATINGS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* Sector search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Sector…"
            value={sectorSearch}
            onChange={(e) => setSectorSearch(e.target.value)}
            list="sector-options"
            className="pl-8 pr-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-44"
          />
          <datalist id="sector-options">
            {uniqueSectors.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>

        {/* Clear filters button — only shown when a filter is active */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 bg-gray-900 text-gray-400 hover:border-red-500 hover:text-red-400 transition"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}

        {/* Result count */}
        <span className="text-xs text-gray-600 ml-auto">
          {sorted.length} of {entries.length} results
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-500 text-sm">
          No results match the current filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <Th label="Symbol" />
                <SortTh
                  k="signal" current={sortKey} dir={sortDir} onClick={toggleSort}
                  label={<>Signal<InfoTooltip title="Signal Types" width="w-80" side="bottom">
                    <ul className="space-y-1.5">
                      <li><span className="text-emerald-400 font-semibold">BREAKOUT</span> — Price near 52-week high with full EMA alignment and RSI 50–75. Momentum continuation — buy the strength.</li>
                      <li><span className="text-blue-400 font-semibold">PULLBACK</span> — Stock in uptrend, pulled back to EMA 50 or Fibonacci support. Lower-risk re-entry into an existing trend.</li>
                      <li><span className="text-purple-400 font-semibold">MEAN REVERT</span> — 15–35% below 52-week high with RSI &lt; 35. Oversold bounce play — catching a recovery with confirmation.</li>
                      <li><span className="text-amber-400 font-semibold">WATCH</span> — Meets 3–4 of 6 criteria. Not quite ready — monitor for a better setup.</li>
                      <li><span className="text-red-400 font-semibold">AVOID</span> — Price below EMA 200 or deteriorating EMA structure. Not suitable for swing trading.</li>
                    </ul>
                  </InfoTooltip></>}
                />
                <SortTh label="Price" k="price" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortTh
                  k="minerviniScore" current={sortKey} dir={sortDir} onClick={toggleSort}
                  label={<>Score<InfoTooltip title="Minervini Trend Score (0–6)" side="bottom" width="w-80">
                    <p>Mark Minervini&apos;s Trend Template — 1 point per condition:</p>
                    <ol className="mt-1 space-y-0.5 list-decimal list-inside">
                      <li>Price &gt; EMA 50</li>
                      <li>Price &gt; EMA 150</li>
                      <li>Price &gt; EMA 200</li>
                      <li>EMA 50 &gt; EMA 150 &gt; EMA 200</li>
                      <li>EMA 200 trending up vs. 20 days ago</li>
                      <li>Price within 25% of 52-week high</li>
                    </ol>
                    <p className="mt-1"><span className="text-emerald-400">5–6</span> Strong · <span className="text-amber-400">3–4</span> Watch · <span className="text-red-400">0–2</span> Avoid</p>
                  </InfoTooltip></>}
                />
                <SortTh
                  k="rsi" current={sortKey} dir={sortDir} onClick={toggleSort}
                  label={<>RSI<InfoTooltip title="RSI — Relative Strength Index (14)" side="bottom">
                    <p>Momentum oscillator, 0–100 scale:</p>
                    <ul className="mt-1 space-y-0.5">
                      <li><span className="text-emerald-400">Below 35</span> — Oversold, potential buy zone</li>
                      <li><span className="text-gray-300">35–70</span> — Neutral</li>
                      <li><span className="text-red-400">Above 70</span> — Overbought, caution</li>
                    </ul>
                    <p className="mt-1 text-gray-500">Best entries for swing trades: RSI 40–65.</p>
                  </InfoTooltip></>}
                />
                <SortTh
                  k="atrPct" current={sortKey} dir={sortDir} onClick={toggleSort}
                  label={<>ATR%<InfoTooltip title="ATR% — Average True Range as % of Price" side="bottom">
                    <p>Measures daily volatility relative to the stock&apos;s price. Higher = wider daily swings.</p>
                    <ul className="mt-1 space-y-0.5">
                      <li><span className="text-emerald-400">&gt; 2%</span> — High volatility, good swing potential</li>
                      <li><span className="text-amber-400">1–2%</span> — Moderate, acceptable</li>
                      <li><span className="text-red-400">&lt; 1%</span> — Low volatility, slow mover</li>
                    </ul>
                    <p className="mt-1 text-gray-500">Used to size stop-loss distance and position size.</p>
                  </InfoTooltip></>}
                />
                <SortTh
                  k="distanceFromHigh" current={sortKey} dir={sortDir} onClick={toggleSort}
                  label={<>Off High<InfoTooltip title="Distance from 52-Week High" side="bottom">
                    <p>How far the current price is below its 52-week high, expressed as a percentage.</p>
                    <ul className="mt-1 space-y-0.5">
                      <li><span className="text-emerald-400">0–5%</span> — Near highs, breakout zone</li>
                      <li><span className="text-amber-400">5–20%</span> — Pullback territory</li>
                      <li><span className="text-purple-400">20–35%</span> — Mean reversion candidate</li>
                      <li><span className="text-red-400">&gt; 35%</span> — Significant decline, avoid unless strong catalyst</li>
                    </ul>
                  </InfoTooltip></>}
                />
                <SortTh
                  k="avgVolume" current={sortKey} dir={sortDir} onClick={toggleSort}
                  label={<>Avg Vol<InfoTooltip title="Average Daily Volume" side="bottom">
                    <p>Average number of shares traded per day over recent periods.</p>
                    <p className="mt-1">Higher volume = more liquidity. Easier to enter and exit positions without large slippage.</p>
                    <p className="mt-1"><span className="text-emerald-400">&gt; 5M/day</span> — Highly liquid<br/><span className="text-amber-400">1–5M/day</span> — Acceptable<br/><span className="text-red-400">&lt; 1M/day</span> — Low liquidity, wider spreads</p>
                  </InfoTooltip></>}
                />
                <SortTh
                  k="ema8" current={sortKey} dir={sortDir} onClick={toggleSort}
                  label={<>EMA 8<InfoTooltip title="EMA 8 — 8-Day Exponential Moving Average" side="bottom">
                    <p>Ultra short-term momentum indicator. Reacts very quickly to price changes.</p>
                    <ul className="mt-1 space-y-0.5">
                      <li><span className="text-emerald-400">Price above EMA 8</span> — Very short-term bullish momentum</li>
                      <li><span className="text-red-400">Price below EMA 8</span> — Short-term weakness</li>
                    </ul>
                    <p className="mt-1 text-gray-500">Used for fine-tuning precise entry timing, not trend direction.</p>
                  </InfoTooltip></>}
                />
                <ThInfo label="EMA 50" tooltip={
                  <InfoTooltip title="EMA 50 — 50-Day Exponential Moving Average" side="bottom">
                    <p>Short-term trend support/resistance (≈ 10 trading weeks).</p>
                    <ul className="mt-1 space-y-0.5">
                      <li><span className="text-emerald-400">Price above</span> — Short-term uptrend intact</li>
                      <li><span className="text-red-400">Price below</span> — Short-term weakness</li>
                    </ul>
                    <p className="mt-1 text-gray-500">PULLBACK setups often use EMA 50 as the entry trigger.</p>
                  </InfoTooltip>
                }/>
                <ThInfo label="EMA 150" tooltip={
                  <InfoTooltip title="EMA 150 — 150-Day Exponential Moving Average" side="bottom">
                    <p>Medium-term trend indicator (≈ 30 trading weeks).</p>
                    <p className="mt-1">Stocks above EMA 150 are in a medium-term uptrend. Part of the Minervini Trend Template — price must be above EMA 150 to qualify.</p>
                  </InfoTooltip>
                }/>
                <ThInfo label="EMA 200" tooltip={
                  <InfoTooltip title="EMA 200 — 200-Day Exponential Moving Average" side="bottom">
                    <p>The most important long-term trend indicator. Watched by fund managers and institutions worldwide.</p>
                    <ul className="mt-1 space-y-0.5">
                      <li><span className="text-emerald-400">Price above EMA 200</span> — Long-term bull market for this stock</li>
                      <li><span className="text-red-400">Price below EMA 200</span> — Long-term bear market. Avoid longs.</li>
                    </ul>
                  </InfoTooltip>
                }/>
                <ThInfo label="TV Rating" tooltip={
                  <InfoTooltip title="TradingView Technical Rating" side="bottom">
                    <p>TradingView&apos;s composite score combining 26 technical indicators (moving averages + oscillators like RSI, MACD, Stochastic, etc.).</p>
                    <ul className="mt-1 space-y-0.5">
                      <li><span className="text-emerald-400 font-semibold">Strong Buy</span> — Most indicators bullish</li>
                      <li><span className="text-green-400 font-semibold">Buy</span> — More bullish than bearish signals</li>
                      <li><span className="text-amber-400 font-semibold">Neutral</span> — Mixed signals</li>
                      <li><span className="text-red-400 font-semibold">Sell / Strong Sell</span> — Most indicators bearish</li>
                    </ul>
                  </InfoTooltip>
                }/>
                <Th label="Sector" />
                <Th label="" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-gray-950 text-xs">
              {sorted.map((e) => {
                const isAdded = !!added[e.symbol];
                return (
                  <tr key={e.symbol} className="hover:bg-gray-900/60 transition">
                    <td className="px-3 py-2">
                      <Link href={`/stock/${e.symbol}`} className="font-semibold text-white hover:text-blue-400">
                        {e.symbol}
                      </Link>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]">{e.name}</div>
                    </td>
                    <td className="px-3 py-2"><SignalBadge signal={e.signal} /></td>
                    <td className="px-3 py-2 text-gray-200">${e.price.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span className={`font-semibold ${e.minerviniScore >= 5 ? 'text-emerald-400' : e.minerviniScore >= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                        {e.minerviniScore}/6
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={e.rsi < 35 ? 'text-emerald-400' : e.rsi > 70 ? 'text-red-400' : 'text-gray-200'}>{e.rsi.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-200">{e.atrPct.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-gray-200">-{e.distanceFromHigh.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-gray-400">{(e.avgVolume / 1_000_000).toFixed(1)}M</td>
                    <td className="px-3 py-2">
                      <EmaCell value={e.ema8} price={e.price} purple />
                    </td>
                    <td className="px-3 py-2">
                      <EmaCell value={e.ema50} price={e.price} />
                    </td>
                    <td className="px-3 py-2">
                      <EmaCell value={e.ema150} price={e.price} />
                    </td>
                    <td className="px-3 py-2">
                      <EmaCell value={e.ema200} price={e.price} />
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {e.tvRating ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-500 truncate max-w-[120px]">{e.sector || '—'}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => addToWatchlist(e)}
                        disabled={isAdded}
                        title={isAdded ? 'Already in watchlist' : 'Add to watchlist'}
                        className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition ${
                          isAdded
                            ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 cursor-default'
                            : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-blue-600 hover:text-white hover:border-blue-500'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Added
                          </>
                        ) : (
                          <>
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Watchlist
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmaCell({ value, price, purple = false }: { value: number; price: number; purple?: boolean }) {
  if (!value || isNaN(value)) return <span className="text-gray-600 text-xs">—</span>;
  const above = price >= value;
  const color = purple
    ? (above ? 'text-purple-400' : 'text-red-400')
    : (above ? 'text-emerald-400' : 'text-red-400');
  const dimColor = purple
    ? (above ? 'text-purple-600' : 'text-red-600')
    : (above ? 'text-emerald-600' : 'text-red-600');
  return (
    <div>
      <span className={`text-xs font-medium ${color}`}>${value.toFixed(2)}</span>
      <span className={`ml-1 text-xs ${dimColor}`}>{above ? '▲' : '▼'}</span>
    </div>
  );
}

import type { ReactNode } from 'react';

function Th({ label }: { label: string }) {
  return <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{label}</th>;
}

/** Header cell with an inline InfoTooltip icon (non-sortable) */
function ThInfo({ label, tooltip }: { label: string; tooltip: ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
      <span className="inline-flex items-center gap-0">{label}{tooltip}</span>
    </th>
  );
}

function SortTh({ label, k, current, dir, onClick }: {
  label: ReactNode; k: SortKey; current: SortKey; dir: 'asc' | 'desc'; onClick: (k: SortKey) => void;
}) {
  const active = k === current;
  return (
    // Make the <th> itself the sort click target — avoids nesting <button> inside <button>
    // InfoTooltip calls e.stopPropagation() so its ⓘ click won't trigger sorting
    <th
      className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider select-none whitespace-nowrap cursor-pointer hover:text-gray-200 transition ${active ? 'text-blue-400' : 'text-gray-500'}`}
      onClick={() => onClick(k)}
    >
      <span className="inline-flex items-center gap-0">
        {label}
        <span className="ml-0.5">{active ? (dir === 'desc' ? ' ↓' : ' ↑') : ' ↕'}</span>
      </span>
    </th>
  );
}
