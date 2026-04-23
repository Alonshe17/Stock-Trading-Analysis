'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SignalBadge } from './SignalBadge';
import { EarningsWarning } from './EarningsWarning';
import { PriceAlertBell } from './PriceAlertBell';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { AddToWatchlistButton } from '@/components/trading/AddToWatchlistButton';
import type { AnalysisResult } from '@/lib/analysis';
import type { WatchlistItem } from '@/lib/watchlist';

const STORAGE_KEY = 'swingmonitor_watchlist';

type StockData = AnalysisResult & {
  name: string;
  marketRegime: string;
  earningsDate?: string | null;
  // Fundamentals from Finnhub (piped through analysis API route)
  revenueGrowth:    number | null;  // YoY % e.g. 12.5
  roeTTM:           number | null;  // % e.g. 18.3
  operatingMargin:  number | null;  // %
  profitMargin:     number | null;  // %
  debtToEquity:     number | null;  // % where 100 = 1.0x D/E ratio
  currentRatio:     number | null;  // ratio e.g. 1.8
  cashFlowPerShare: number | null;  // $ per share
  analystRating:    string | null;
  analystBuy:       number;
  analystHold:      number;
  analystSell:      number;
};

/**
 * 7-criteria fundamental health score based on professional investor standards:
 *
 * 1. ROE ≥ 15%          — Buffett's minimum capital efficiency threshold
 * 2. Revenue Growth ≥ 10% — Healthy top-line expansion (YoY)
 * 3. Operating Margin ≥ 10% — Efficient operations before interest/tax
 * 4. Net Margin ≥ 8%    — Profitable after all costs (near S&P 500 avg)
 * 5. Debt/Equity ≤ 100% — Conservative leverage (Graham: prefer <1.0x D/E)
 * 6. Current Ratio ≥ 1.5 — Graham's liquidity standard
 * 7. Cash Flow/Share > 0 — Positive free cash generation
 *
 * Score 5–7 → Strong · 3–4 → Moderate · 0–2 → Weak
 * Requires ≥ 3 data points; otherwise returns null (hidden).
 */
function fundamentalHealth(data: StockData): {
  label: string;
  color: string;
  score: number;
  max: number;
  breakdown: { label: string; pass: boolean | null }[];
} | null {
  const criteria: { label: string; pass: boolean | null }[] = [
    {
      label: `ROE ≥ 15% (${data.roeTTM !== null ? data.roeTTM.toFixed(1) + '%' : '—'})`,
      pass:  data.roeTTM !== null ? data.roeTTM >= 15 : null,
    },
    {
      label: `Rev Growth ≥ 10% (${data.revenueGrowth !== null ? data.revenueGrowth.toFixed(1) + '%' : '—'})`,
      pass:  data.revenueGrowth !== null ? data.revenueGrowth >= 10 : null,
    },
    {
      label: `Op Margin ≥ 10% (${data.operatingMargin !== null ? data.operatingMargin.toFixed(1) + '%' : '—'})`,
      pass:  data.operatingMargin !== null ? data.operatingMargin >= 10 : null,
    },
    {
      label: `Net Margin ≥ 8% (${data.profitMargin !== null ? data.profitMargin.toFixed(1) + '%' : '—'})`,
      pass:  data.profitMargin !== null ? data.profitMargin >= 8 : null,
    },
    {
      label: `Debt/Equity ≤ 1.0x (${data.debtToEquity !== null ? (data.debtToEquity / 100).toFixed(2) + 'x' : '—'})`,
      pass:  data.debtToEquity !== null ? data.debtToEquity <= 100 : null,
    },
    {
      label: `Current Ratio ≥ 1.5 (${data.currentRatio !== null ? data.currentRatio.toFixed(2) : '—'})`,
      pass:  data.currentRatio !== null ? data.currentRatio >= 1.5 : null,
    },
    {
      label: `Cash Flow/Share > 0 (${data.cashFlowPerShare !== null ? '$' + data.cashFlowPerShare.toFixed(2) : '—'})`,
      pass:  data.cashFlowPerShare !== null ? data.cashFlowPerShare > 0 : null,
    },
  ];

  const available = criteria.filter((c) => c.pass !== null);
  if (available.length < 3) return null;  // not enough data to score

  const score = available.filter((c) => c.pass === true).length;
  const max   = available.length;

  if (score >= 5) return { label: 'Strong',   color: 'text-emerald-400', score, max, breakdown: criteria };
  if (score >= 3) return { label: 'Moderate', color: 'text-amber-400',  score, max, breakdown: criteria };
  return               { label: 'Weak',     color: 'text-red-400',     score, max, breakdown: criteria };
}

const ANALYST_COLORS: Record<string, string> = {
  'Strong Buy': 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50',
  'Buy':        'bg-green-900/50   text-green-400   border-green-700/50',
  'Hold':       'bg-amber-900/50   text-amber-400   border-amber-700/50',
  'Sell':       'bg-red-900/50     text-red-400     border-red-700/50',
};

type LoadState = 'idle' | 'loading' | 'done' | 'error';

type WatchlistEntry = {
  symbol: string;
  name: string;
  type: 'stock' | 'etf';
  warning?: 'small-cap';
};

function toEntry(item: WatchlistItem): WatchlistEntry {
  return { symbol: item.symbol, name: item.name, type: item.type, warning: item.warning };
}

export function WatchlistManager({ defaults }: { defaults: WatchlistItem[] }) {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [dataMap, setDataMap] = useState<Record<string, StockData>>({});
  const [loadMap, setLoadMap] = useState<Record<string, LoadState>>({});
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [refreshingAll, setRefreshingAll] = useState(false);

  // Helper — write the list to localStorage immediately (synchronous, no effect lag)
  function persist(list: WatchlistEntry[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }

  // Load saved watchlist from localStorage — runs ONCE on mount only.
  // Using [] dependency so a new `defaults` array reference on each server render
  // never accidentally re-runs this and wipes user-added tickers.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: WatchlistEntry[] = JSON.parse(saved);
        // Only use saved data if it's a non-empty valid array
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWatchlist(parsed);
          return; // ← early return keeps localStorage untouched
        }
      }
    } catch {
      // JSON was corrupted — fall through to seed with defaults below
    }

    // First visit OR empty/corrupted storage → seed with defaults
    const initial = defaults.map(toEntry);
    setWatchlist(initial);
    persist(initial);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch analysis for a single symbol
  const fetchStock = useCallback(async (symbol: string) => {
    setLoadMap((prev) => ({ ...prev, [symbol]: 'loading' }));
    try {
      const res = await fetch(`/api/stocks/analysis?symbol=${symbol}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Fetch earnings
      const today = new Date().toISOString().split('T')[0];
      const inFive = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
      const eRes = await fetch(`/api/stocks/earnings?symbol=${symbol}&from=${today}&to=${inFive}`).catch(() => null);
      const earningsDate = eRes?.ok ? (await eRes.json()).date : null;

      setDataMap((prev) => ({ ...prev, [symbol]: { ...data, earningsDate } }));
      setLoadMap((prev) => ({ ...prev, [symbol]: 'done' }));
    } catch {
      setLoadMap((prev) => ({ ...prev, [symbol]: 'error' }));
    }
  }, []);

  // Fetch all stocks in watchlist that don't have data yet
  useEffect(() => {
    watchlist.forEach((w, i) => {
      if (!dataMap[w.symbol] && loadMap[w.symbol] !== 'loading') {
        setTimeout(() => fetchStock(w.symbol), i * 400);
      }
    });
  }, [watchlist]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    const symbol = input.trim().toUpperCase();
    if (!symbol) return;
    if (watchlist.some((w) => w.symbol === symbol)) {
      setAddError(`${symbol} is already in your watchlist`);
      return;
    }

    setAdding(true);
    setAddError('');

    try {
      const res = await fetch(`/api/stocks/analysis?symbol=${symbol}`);
      const data = await res.json();
      if (data.error || data.price === 0) {
        setAddError(`${symbol} not found — check the ticker symbol`);
        setAdding(false);
        return;
      }

      const newEntry: WatchlistEntry = { symbol, name: data.name ?? symbol, type: 'stock' };
      setWatchlist((prev) => {
        // Guard: don't add if already present (race condition safety)
        if (prev.some((w) => w.symbol === symbol)) return prev;
        const updated = [...prev, newEntry];
        persist(updated);
        return updated;
      });
      setDataMap((prev) => ({ ...prev, [symbol]: data }));
      setLoadMap((prev) => ({ ...prev, [symbol]: 'done' }));
      setInput('');
    } catch {
      setAddError('Failed to fetch data — try again');
    }
    setAdding(false);
  }

  function handleRemove(symbol: string) {
    setWatchlist((prev) => {
      const updated = prev.filter((w) => w.symbol !== symbol);
      persist(updated); // save immediately
      return updated;
    });
    setDataMap((prev) => { const n = { ...prev }; delete n[symbol]; return n; });
    setLoadMap((prev) => { const n = { ...prev }; delete n[symbol]; return n; });
  }

  function handleRefresh(symbol: string) {
    setDataMap((prev) => { const n = { ...prev }; delete n[symbol]; return n; });
    fetchStock(symbol);
  }

  async function handleRefreshAll() {
    setRefreshingAll(true);
    // Clear all existing data so cards show skeleton
    setDataMap({});
    setLoadMap({});
    // Re-fetch all with stagger to avoid rate limits
    await Promise.all(
      watchlist.map((w, i) =>
        new Promise<void>((resolve) =>
          setTimeout(() => fetchStock(w.symbol).then(() => resolve()), i * 400)
        )
      )
    );
    setRefreshingAll(false);
  }

  return (
    <div>
      {/* Add ticker input */}
      <div className="mb-6">
        <div className="flex gap-2 max-w-sm flex-wrap sm:flex-nowrap">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value.toUpperCase()); setAddError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add ticker e.g. AMZN"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none uppercase"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {adding ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            Add
          </button>

          {/* Refresh All */}
          <button
            onClick={handleRefreshAll}
            disabled={refreshingAll || watchlist.length === 0}
            title="Refresh all prices"
            className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 whitespace-nowrap"
          >
            <svg
              className={`h-4 w-4 ${refreshingAll ? 'animate-spin' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshingAll ? 'Refreshing…' : 'Refresh All'}
          </button>
        </div>
        {addError && <p className="text-red-400 text-xs mt-2">{addError}</p>}
      </div>

      {/* Stock grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {watchlist.map((w) => {
          const state = loadMap[w.symbol] ?? 'idle';
          const data = dataMap[w.symbol];

          if (state === 'loading' || state === 'idle') {
            return <SkeletonCard key={w.symbol} symbol={w.symbol} name={w.name} />;
          }

          if (state === 'error' || !data) {
            return (
              <ErrorCard
                key={w.symbol}
                symbol={w.symbol}
                name={w.name}
                onRemove={() => handleRemove(w.symbol)}
                onRetry={() => handleRefresh(w.symbol)}
              />
            );
          }

          return (
            <StockCardEditable
              key={w.symbol}
              data={data}
              item={w}
              onRemove={() => handleRemove(w.symbol)}
              onRefresh={() => handleRefresh(w.symbol)}
            />
          );
        })}
      </div>

      {watchlist.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-700 p-12 text-center text-gray-500">
          <p className="text-sm">Your watchlist is empty.</p>
          <p className="text-xs mt-1">Add a ticker above to get started.</p>
        </div>
      )}
    </div>
  );
}

function StockCardEditable({
  data, item, onRemove, onRefresh,
}: {
  data: StockData;
  item: WatchlistEntry;
  onRemove: () => void;
  onRefresh: () => void;
}) {
  const changePos = data.change >= 0;

  return (
    <div className="relative group rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-gray-600">
      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex gap-0.5 items-center">
        {/* Bell always visible when alert is set, otherwise shows on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition">
          <PriceAlertBell symbol={data.symbol} name={item.name} currentPrice={data.price} />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition flex gap-0.5">
          <button
            onClick={onRefresh}
            title="Refresh"
            className="rounded p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-800 transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            title="Remove"
            className="rounded p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Header — no Link wrapper so tooltips never accidentally navigate */}
      <div className="flex items-start justify-between gap-2 mb-3 pr-12">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-white">{data.symbol}</span>
            {item.type === 'etf' && <span className="text-xs text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">ETF</span>}
            {item.warning === 'small-cap' && <span className="text-xs text-amber-500 border border-amber-700/50 rounded px-1.5 py-0.5">Small-Cap ⚠</span>}
          </div>
          <div className="text-sm text-gray-400 mt-0.5">{item.name || data.symbol}</div>
        </div>
        <SignalBadge signal={data.signal} />
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-semibold text-white">${data.price.toFixed(2)}</span>
        <span className={`text-sm font-medium ${changePos ? 'text-emerald-400' : 'text-red-400'}`}>
          {changePos ? '+' : ''}{data.change.toFixed(2)}%
        </span>
      </div>

      {data.earningsDate && (
        <div className="mb-3"><EarningsWarning date={data.earningsDate} /></div>
      )}

      {/* Daily OHLC */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs mb-2">
        <Stat label="Open"  value={`$${data.open > 0 ? data.open.toFixed(2) : '—'}`}  color="text-gray-300" />
        <Stat label="High"  value={`$${data.high > 0 ? data.high.toFixed(2) : '—'}`}  color="text-emerald-400" />
        <Stat label="Low"   value={`$${data.low > 0 ? data.low.toFixed(2) : '—'}`}    color="text-red-400" />
      </div>

      {/* 52-week range */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mb-2">
        <Stat label="52wk High" value={`$${data.week52High > 0 ? data.week52High.toFixed(2) : '—'}`} color="text-emerald-400" />
        <Stat label="52wk Low"  value={`$${data.week52Low > 0 ? data.week52Low.toFixed(2) : '—'}`}  color="text-red-400" />
      </div>

      {/* Fundamentals */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs mb-2">
        <Stat label="P/E"     value={data.peRatio > 0 ? data.peRatio.toFixed(1) : '—'}              color="text-gray-300" />
        <Stat label="Mkt Cap" value={data.marketCap > 0 ? formatMktCap(data.marketCap) : '—'}       color="text-gray-300" />
        <Stat label="Div Yld" value={data.dividend > 0 ? `${data.dividend.toFixed(2)}%` : '—'}      color="text-amber-400" />
      </div>

      {/* Fundamental health + analyst rating */}
      {(() => {
        const health = fundamentalHealth(data);
        const totalAnalysts = (data.analystBuy ?? 0) + (data.analystHold ?? 0) + (data.analystSell ?? 0);
        const ratingCls = data.analystRating ? (ANALYST_COLORS[data.analystRating] ?? 'bg-gray-800 text-gray-400 border-gray-700') : null;
        if (!health && !ratingCls) return null;
        return (
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {health && (
              <span className={`inline-flex items-center text-xs font-medium ${health.color}`}>
                {health.label} Fundamentals ({health.score}/{health.max})
                <InfoTooltip title="Fundamental Health Score" side="top" width="w-80">
                  <p className="mb-1.5">
                    Score <span className="font-semibold text-white">{health.score}/{health.max}</span> based on 7 professional criteria
                    (Buffett · Graham · institutional screens):
                  </p>
                  <ul className="space-y-1">
                    {health.breakdown.map((c) => (
                      <li key={c.label} className="flex items-start gap-1.5">
                        <span className={`mt-0.5 shrink-0 ${c.pass === true ? 'text-emerald-400' : c.pass === false ? 'text-red-400' : 'text-gray-600'}`}>
                          {c.pass === true ? '✓' : c.pass === false ? '✗' : '—'}
                        </span>
                        <span className={c.pass === null ? 'text-gray-600' : 'text-gray-300'}>{c.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-gray-500">
                    ≥5 Strong · 3–4 Moderate · &lt;3 Weak
                  </p>
                  <p className="mt-1 text-gray-600 text-xs">📚 W. Buffett (Annual Letters) · B. Graham, <em>The Intelligent Investor</em> (1949) · See <a href="/methodology" className="underline">Methodology</a></p>
                </InfoTooltip>
              </span>
            )}
            {ratingCls && data.analystRating && (
              <span className={`text-xs border rounded px-1.5 py-0.5 font-medium ${ratingCls}`}>
                {data.analystRating}
              </span>
            )}
            {totalAnalysts > 0 && (
              <span className="text-xs text-gray-600">{totalAnalysts} analyst{totalAnalysts !== 1 ? 's' : ''}</span>
            )}
          </div>
        );
      })()}

        {/* TA stats */}
        <div className="grid grid-cols-3 gap-2 text-xs border-t border-gray-800 pt-2">
          <Stat
            label="RSI"
            value={data.rsi.toFixed(1)}
            color={data.rsi < 35 ? 'text-emerald-400' : data.rsi > 70 ? 'text-red-400' : 'text-gray-300'}
            tooltip={
              <>
                <p>Relative Strength Index (14-period) — measures momentum on a 0–100 scale.</p>
                <ul className="mt-1 space-y-0.5">
                  <li><span className="text-emerald-400 font-semibold">&lt; 35</span> — Oversold: potential bounce zone</li>
                  <li><span className="text-gray-300 font-semibold">35–70</span> — Neutral: healthy trend range</li>
                  <li><span className="text-red-400 font-semibold">&gt; 70</span> — Overbought: pullback risk</li>
                </ul>
                <p className="mt-1 text-gray-600 text-xs">📚 J.W. Wilder Jr., <em>New Concepts in Technical Trading Systems</em> (1978)</p>
              </>
            }
          />
          <Stat
            label="ATR%"
            value={`${data.atrPct.toFixed(1)}%`}
            color="text-gray-300"
            tooltip={
              <>
                <p>Average True Range as % of price (14-period). Measures how much the stock typically moves per day.</p>
                <ul className="mt-1 space-y-0.5">
                  <li><span className="text-emerald-400 font-semibold">&gt; 2%</span> — High volatility, good swing potential</li>
                  <li><span className="text-amber-400 font-semibold">1–2%</span> — Moderate — workable swings</li>
                  <li><span className="text-red-400 font-semibold">&lt; 1%</span> — Low volatility, smaller moves</li>
                </ul>
                <p className="mt-1 text-gray-400">Used to size stops: stop = entry − 1.5× ATR.</p>
                <p className="mt-1 text-gray-600 text-xs">📚 J.W. Wilder Jr., <em>New Concepts in Technical Trading Systems</em> (1978)</p>
              </>
            }
          />
          <Stat
            label="Score"
            value={`${data.minerviniScore}/6`}
            color={data.minerviniScore >= 5 ? 'text-emerald-400' : data.minerviniScore >= 3 ? 'text-amber-400' : 'text-red-400'}
            tooltip={
              <>
                <p>Minervini Trend Template — 1 point per condition met:</p>
                <ol className="mt-1 space-y-0.5 list-decimal list-inside">
                  <li>Price &gt; EMA 50</li>
                  <li>Price &gt; EMA 150</li>
                  <li>Price &gt; EMA 200</li>
                  <li>EMA 50 &gt; 150 &gt; 200</li>
                  <li>EMA 200 trending up</li>
                  <li>Within 25% of 52-week high</li>
                </ol>
                <p className="mt-1">
                  <span className="text-emerald-400">5–6</span> Strong ·{' '}
                  <span className="text-amber-400">3–4</span> Watch ·{' '}
                  <span className="text-red-400">0–2</span> Avoid
                </p>
                <p className="mt-1 text-gray-600 text-xs">📚 M. Minervini, <em>Trade Like a Stock Market Wizard</em> (2013)</p>
              </>
            }
          />
          <Stat
            label="Off High"
            value={`-${data.distanceFromHigh.toFixed(1)}%`}
            color={data.distanceFromHigh <= 5 ? 'text-emerald-400' : data.distanceFromHigh >= 20 ? 'text-amber-400' : 'text-gray-300'}
            tooltip={
              <>
                <p>How far the price is below its 52-week high.</p>
                <ul className="mt-1 space-y-0.5">
                  <li><span className="text-emerald-400 font-semibold">0–5%</span> — Near highs, breakout zone</li>
                  <li><span className="text-gray-300 font-semibold">5–20%</span> — Pullback, possible re-entry</li>
                  <li><span className="text-amber-400 font-semibold">&gt; 20%</span> — Deep pullback or downtrend</li>
                </ul>
                <p className="mt-1 text-gray-600 text-xs">📚 M. Minervini, <em>Trade Like a Stock Market Wizard</em> (2013) · See <a href="/methodology" className="underline">Methodology</a></p>
              </>
            }
          />
          {data.pattern && (
            <div className="col-span-2">
              <Stat
                label="Pattern"
                value={data.pattern}
                color="text-blue-400"
                tooltip={
                  <>
                    {PATTERN_TIPS[data.pattern]
                      ? <p>{PATTERN_TIPS[data.pattern]}</p>
                      : <p>A candlestick pattern detected on the most recent daily candle.</p>
                    }
                    <p className="mt-1 text-gray-600 text-xs">📚 S. Nison, <em>Japanese Candlestick Charting Techniques</em> (1991)</p>
                  </>
                }
              />
            </div>
          )}
        </div>

      {/* Footer — Full Analysis link, same style as TrendCard */}
      <div className="pt-3 mt-1 border-t border-gray-800 flex items-center justify-between gap-2">
        <Link
          href={`/stock/${data.symbol}`}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Full Analysis →
        </Link>
        <AddToWatchlistButton symbol={data.symbol} name={item.name} />
      </div>
    </div>
  );
}

function SkeletonCard({ symbol, name }: { symbol: string; name: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 animate-pulse">
      <div className="flex justify-between mb-3">
        <div>
          <div className="font-bold text-white">{symbol}</div>
          <div className="text-sm text-gray-500">{name}</div>
        </div>
        <div className="h-5 w-20 rounded bg-gray-800" />
      </div>
      <div className="h-8 w-32 rounded bg-gray-800 mb-3" />
      <div className="grid grid-cols-3 gap-2">
        {[1,2,3].map(i => <div key={i} className="h-8 rounded bg-gray-800" />)}
      </div>
    </div>
  );
}

function ErrorCard({ symbol, name, onRemove, onRetry }: { symbol: string; name: string; onRemove: () => void; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-900/40 bg-gray-900 p-5">
      <div className="flex justify-between mb-2">
        <div>
          <div className="font-bold text-white">{symbol}</div>
          <div className="text-sm text-gray-500">{name}</div>
        </div>
        <button onClick={onRemove} className="text-gray-600 hover:text-red-400 transition">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-red-400 mb-3">Failed to load data</p>
      <button onClick={onRetry} className="text-xs text-blue-400 hover:underline">Retry</button>
    </div>
  );
}

function Stat({ label, value, color, tooltip }: { label: string; value: string; color: string; tooltip?: ReactNode }) {
  return (
    <div>
      <div className="text-gray-500 mb-0.5 inline-flex items-center gap-0">
        {label}
        {tooltip && (
          <InfoTooltip title={label} side="top">
            {tooltip}
          </InfoTooltip>
        )}
      </div>
      <div className={`font-semibold ${color}`}>{value}</div>
    </div>
  );
}

const PATTERN_TIPS: Record<string, string> = {
  'Pin Bar':           'Long wick with a small body — shows strong rejection of a price level. A bullish pin bar has a long lower wick (buyers stepped in and pushed price back up). Great reversal signal at support.',
  'Bullish Engulfing': 'A large green candle that fully engulfs the previous red candle\'s body. Signals that buyers have overwhelmed sellers — often marks the start of an upward move.',
  'Bearish Engulfing': 'A large red candle that fully engulfs the previous green candle\'s body. Signals that sellers have overwhelmed buyers — often marks the start of a downward move.',
  'Inside Bar':        'The entire candle range (high-to-low) fits within the previous candle. Shows market consolidation or indecision. A breakout from an inside bar often leads to a sharp directional move.',
  'Breakout Candle':   'A large-bodied candle closing near its high with a volume spike. Signals strong conviction from buyers — often marks the start of a new upward leg with momentum.',
};

function formatMktCap(mCapM: number): string {
  if (mCapM >= 1_000_000) return `$${(mCapM / 1_000_000).toFixed(1)}T`;
  if (mCapM >= 1_000) return `$${(mCapM / 1_000).toFixed(0)}B`;
  return `$${mCapM.toFixed(0)}M`;
}
