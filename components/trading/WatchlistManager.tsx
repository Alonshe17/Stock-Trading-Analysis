'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SignalBadge } from './SignalBadge';
import { EarningsWarning } from './EarningsWarning';
import { PriceAlertBell } from './PriceAlertBell';
import type { AnalysisResult } from '@/lib/analysis';
import type { WatchlistItem } from '@/lib/watchlist';

const STORAGE_KEY = 'swingmonitor_watchlist';

type StockData = AnalysisResult & {
  name: string;
  marketRegime: string;
  earningsDate?: string | null;
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

  return (
    <div>
      {/* Add ticker input */}
      <div className="mb-6">
        <div className="flex gap-2 max-w-sm">
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

      <Link href={`/stock/${data.symbol}`} className="block">
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
          <Stat label="P/E"     value={data.peRatio > 0 ? data.peRatio.toFixed(1) : '—'}                        color="text-gray-300" />
          <Stat label="Mkt Cap" value={data.marketCap > 0 ? formatMktCap(data.marketCap) : '—'}                 color="text-gray-300" />
          <Stat label="Div Yld" value={data.dividend > 0 ? `${data.dividend.toFixed(2)}%` : '—'}              color="text-amber-400" />
        </div>

        {/* TA stats */}
        <div className="grid grid-cols-3 gap-2 text-xs border-t border-gray-800 pt-2">
          <Stat label="RSI" value={data.rsi.toFixed(1)} color={data.rsi < 35 ? 'text-emerald-400' : data.rsi > 70 ? 'text-red-400' : 'text-gray-300'} />
          <Stat label="ATR%" value={`${data.atrPct.toFixed(1)}%`} color="text-gray-300" />
          <Stat label="Score" value={`${data.minerviniScore}/6`} color={data.minerviniScore >= 5 ? 'text-emerald-400' : data.minerviniScore >= 3 ? 'text-amber-400' : 'text-red-400'} />
          <Stat label="Off High" value={`-${data.distanceFromHigh.toFixed(1)}%`} color={data.distanceFromHigh <= 5 ? 'text-emerald-400' : data.distanceFromHigh >= 20 ? 'text-amber-400' : 'text-gray-300'} />
          {data.pattern && <div className="col-span-2"><Stat label="Pattern" value={data.pattern} color="text-blue-400" /></div>}
        </div>
      </Link>
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

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-gray-500 mb-0.5">{label}</div>
      <div className={`font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function formatMktCap(mCapM: number): string {
  if (mCapM >= 1_000_000) return `$${(mCapM / 1_000_000).toFixed(1)}T`;
  if (mCapM >= 1_000) return `$${(mCapM / 1_000).toFixed(0)}B`;
  return `$${mCapM.toFixed(0)}M`;
}
