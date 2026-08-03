'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserSupabaseClient as createClient } from '@/lib/supabaseBrowser';
import { getDeviceId, setDeviceId, getSyncCode } from '@/lib/deviceId';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SignalBadge } from './SignalBadge';
import { EarningsWarning } from './EarningsWarning';
import { PriceAlertBell } from './PriceAlertBell';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { AddToWatchlistButton } from '@/components/trading/AddToWatchlistButton';
import type { AnalysisResult } from '@/lib/analysis';
import type { WatchlistItem } from '@/lib/watchlist';
import { StockHeadline } from '@/components/trading/StockHeadline';

const LS_KEY = 'swingmonitor_watchlist'; // legacy localStorage key (for one-time migration)

type StockData = AnalysisResult & {
  name: string;
  sector: string;
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
  const [watchlist, setWatchlist]     = useState<WatchlistEntry[]>([]);
  const [dataMap, setDataMap]         = useState<Record<string, StockData>>({});
  const [loadMap, setLoadMap]         = useState<Record<string, LoadState>>({});
  const [input, setInput]             = useState('');
  const [adding, setAdding]           = useState(false);
  const [addError, setAddError]       = useState('');
  const [addProgress, setAddProgress] = useState<[number, number] | null>(null); // [done, total]
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [dbLoading, setDbLoading]     = useState(true); // true while fetching from Supabase
  const seeded = useRef(false);

  // ── Sync / Recover state ─────────────────────────────────────────────────
  const [showSync, setShowSync]       = useState(false);
  const [syncTab, setSyncTab]         = useState<'code'|'custom'|'recover'>('custom');
  const [syncCode, setSyncCode]       = useState('');         // auto 8-char code
  const [syncInput, setSyncInput]     = useState('');         // enter another device's code
  const [syncStatus, setSyncStatus]   = useState<'idle'|'loading'|'ok'|'error'>('idle');
  const [syncMsg, setSyncMsg]         = useState('');
  // Custom code tab
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [customCodeStatus, setCustomCodeStatus] = useState<'idle'|'loading'|'ok'|'error'>('idle');
  const [customCodeMsg, setCustomCodeMsg]     = useState('');
  // Recover tab
  const [recoverSymbol, setRecoverSymbol]     = useState('');
  const [recoverStatus, setRecoverStatus]     = useState<'idle'|'loading'|'ok'|'error'>('idle');
  const [recoverMsg, setRecoverMsg]           = useState('');
  type RecoverResult = { deviceId: string; syncCode: string; count: number; symbols: string[]; latestAdd: string | null };
  const [recoverResults, setRecoverResults]   = useState<RecoverResult[]>([]);

  // ── Load from Supabase on mount ────────────────────────────────────────────
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    const deviceId = getDeviceId();
    const sb = createClient();

    async function load() {
      const { data, error } = await sb
        .from('watchlist')
        .select('*')
        .eq('device_id', deviceId)
        .order('added_at', { ascending: true });

      const supabaseOk = !error;

      // ── Priority 1: Supabase has saved data ──────────────────────────────────
      if (supabaseOk && data && data.length > 0) {
        const entries: WatchlistEntry[] = data.map((r) => ({
          symbol:  r.symbol,
          name:    r.name,
          type:    r.type as 'stock' | 'etf',
          warning: r.warning ?? undefined,
        }));
        setWatchlist(entries);
        // Sync to localStorage as local backup
        try { localStorage.setItem(LS_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
        setDbLoading(false);
        return;
      }

      // ── Priority 2: Supabase empty/failed — restore from localStorage ────────
      // This covers: Supabase outage, scanner additions not yet synced, first
      // visit on a new browser where cookie restored the device_id.
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed: WatchlistEntry[] = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setWatchlist(parsed);
            // Back-fill Supabase so the next visit uses Priority 1
            if (supabaseOk) {
              void sb.from('watchlist').upsert(
                parsed.map((e, i) => ({
                  device_id: deviceId,
                  symbol:    e.symbol,
                  name:      e.name,
                  type:      e.type,
                  warning:   e.warning ?? null,
                  added_at:  new Date(Date.now() + i * 1000).toISOString(),
                })),
                { onConflict: 'device_id,symbol' },
              );
            }
            setDbLoading(false);
            return;
          }
        }
      } catch { /* ignore corrupted localStorage */ }

      // ── Priority 3: Truly first visit — show empty watchlist ─────────────────
      // Do NOT auto-seed default stocks; let the user add what they actually want.
      setWatchlist([]);
      setDbLoading(false);
    }

    load();
    // Show the user's own sync code once the ID is available
    setSyncCode(getSyncCode());
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

  /** Load a watchlist by deviceId and make it the active one */
  async function adoptDeviceId(newDeviceId: string): Promise<WatchlistEntry[]> {
    setDeviceId(newDeviceId);
    setSyncCode(getSyncCode());
    const sb = createClient();
    const { data, error } = await sb
      .from('watchlist')
      .select('*')
      .eq('device_id', newDeviceId)
      .order('added_at', { ascending: true });
    if (!error && data && data.length > 0) {
      const entries: WatchlistEntry[] = data.map(r => ({
        symbol:  r.symbol,
        name:    r.name,
        type:    r.type as 'stock' | 'etf',
        warning: r.warning ?? undefined,
      }));
      setWatchlist(entries);
      setDataMap({});
      setLoadMap({});
      try { localStorage.setItem(LS_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
      return entries;
    }
    return [];
  }

  /** Tab: Code — enter another device's 8-char auto code */
  async function handleSync() {
    const code = syncInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 8) { setSyncMsg('Enter the full 8-character code'); setSyncStatus('error'); return; }
    setSyncStatus('loading'); setSyncMsg('');
    try {
      const res = await fetch(`/api/watchlist/sync?code=${code}`);
      if (res.status === 404) { setSyncStatus('error'); setSyncMsg('Code not found — make sure the other device has stocks in its watchlist.'); return; }
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (!json.found || !json.deviceId) { setSyncStatus('error'); setSyncMsg('No watchlist found for that code.'); return; }
      const entries = await adoptDeviceId(json.deviceId);
      setSyncStatus('ok');
      setSyncMsg(`Loaded ${entries.length} stock${entries.length !== 1 ? 's' : ''}. This device now shares that watchlist.`);
      setSyncInput('');
    } catch { setSyncStatus('error'); setSyncMsg('Something went wrong — try again.'); }
  }

  /** Tab: Custom — set or load a memorable personal code */
  async function handleCustomCode() {
    const code = customCodeInput.trim().toUpperCase().replace(/\s+/g, '_');
    if (!code || code.length < 4) { setCustomCodeMsg('Choose a code with at least 4 characters'); setCustomCodeStatus('error'); return; }
    setCustomCodeStatus('loading'); setCustomCodeMsg('');
    try {
      const res = await fetch('/api/watchlist/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldDeviceId: getDeviceId(), customCode: code }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const entries = await adoptDeviceId(json.deviceId);
      setCustomCodeStatus('ok');
      if (json.action === 'loaded') {
        setCustomCodeMsg(`Loaded your watchlist — ${entries.length} stock${entries.length !== 1 ? 's' : ''} restored.`);
      } else {
        setCustomCodeMsg(`Code "${code}" saved. Use this code on any device to access your watchlist.`);
      }
      setCustomCodeInput('');
    } catch { setCustomCodeStatus('error'); setCustomCodeMsg('Something went wrong — try again.'); }
  }

  /** Tab: Recover — find a watchlist by a stock symbol you remember */
  async function handleRecover() {
    const sym = recoverSymbol.trim().toUpperCase();
    if (!sym) { setRecoverMsg('Enter a stock symbol'); setRecoverStatus('error'); return; }
    setRecoverStatus('loading'); setRecoverMsg(''); setRecoverResults([]);
    try {
      const res = await fetch(`/api/watchlist/recover?symbol=${sym}`);
      const json = await res.json();
      if (!json.found || !json.results?.length) {
        setRecoverStatus('error');
        setRecoverMsg(`No watchlist found containing ${sym}. Try another symbol.`);
        return;
      }
      setRecoverStatus('ok');
      setRecoverResults(json.results);
      setRecoverMsg('');
    } catch { setRecoverStatus('error'); setRecoverMsg('Something went wrong — try again.'); }
  }

  async function handleRestoreResult(result: RecoverResult) {
    const entries = await adoptDeviceId(result.deviceId);
    setRecoverMsg(`Restored! ${entries.length} stock${entries.length !== 1 ? 's' : ''} loaded.`);
    setRecoverResults([]);
    setRecoverStatus('ok');
  }

  async function handleAdd() {
    const raw = input.trim();
    if (!raw) return;

    // Support multiple symbols separated by semicolons or commas
    const symbols = raw
      .split(/[;,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0 && /^[A-Z.^-]{1,10}$/.test(s));

    if (symbols.length === 0) return;

    setAdding(true);
    setAddError('');
    setAddProgress(symbols.length > 1 ? [0, symbols.length] : null);

    const errors: string[] = [];

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      if (symbols.length > 1) setAddProgress([i + 1, symbols.length]);

      if (watchlist.some((w) => w.symbol === symbol)) {
        errors.push(`${symbol} already in list`);
        continue;
      }

      try {
        const res = await fetch(`/api/stocks/analysis?symbol=${symbol}`);
        const data = await res.json();
        if (data.error || data.price === 0) {
          errors.push(`${symbol} not found`);
          continue;
        }

        const newEntry: WatchlistEntry = { symbol, name: data.name ?? symbol, type: 'stock' };

        setWatchlist((prev) => {
          if (prev.some((w) => w.symbol === symbol)) return prev;
          const next = [...prev, newEntry];
          try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });

        void (async () => {
          try {
            await createClient().from('watchlist').upsert(
              { device_id: getDeviceId(), symbol: newEntry.symbol, name: newEntry.name, type: newEntry.type, added_at: new Date().toISOString() },
              { onConflict: 'device_id,symbol' },
            );
          } catch { /* Supabase optional */ }
        })();

        setDataMap((prev) => ({ ...prev, [symbol]: data }));
        setLoadMap((prev) => ({ ...prev, [symbol]: 'done' }));
      } catch {
        errors.push(`${symbol}: fetch failed`);
      }
    }

    setInput('');
    setAddProgress(null);
    setAddError(errors.length > 0 ? errors.join(' · ') : '');
    setAdding(false);
  }

  async function handleRemove(symbol: string) {
    // Remove from localStorage
    setWatchlist((prev) => {
      const next = prev.filter((w) => w.symbol !== symbol);
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setDataMap((prev) => { const n = { ...prev }; delete n[symbol]; return n; });
    setLoadMap((prev) => { const n = { ...prev }; delete n[symbol]; return n; });

    // Remove from Supabase (fire-and-forget — localStorage already updated)
    void (async () => {
      try {
        await createClient().from('watchlist').delete()
          .eq('device_id', getDeviceId()).eq('symbol', symbol);
      } catch { /* ignore */ }
    })();
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

  // ── Build subsector groups from loaded data ────────────────────────────────
  const subsectorGroups: Record<string, { symbol: string; signal: string }[]> = {};
  for (const w of watchlist) {
    const d = dataMap[w.symbol];
    const raw = d?.sector?.trim() || 'Other';
    // Normalise broad sector names into friendlier subsector labels
    const label =
      raw === 'Technology'            ? 'Technology' :
      raw === 'Healthcare'            ? 'Healthcare' :
      raw === 'Financial Services'    ? 'Financials' :
      raw === 'Consumer Cyclical'     ? 'Consumer Cyclical' :
      raw === 'Consumer Defensive'    ? 'Consumer Defensive' :
      raw === 'Communication Services'? 'Communication' :
      raw === 'Energy'                ? 'Energy' :
      raw === 'Industrials'           ? 'Industrials' :
      raw === 'Basic Materials'       ? 'Materials' :
      raw === 'Real Estate'           ? 'Real Estate' :
      raw === 'Utilities'             ? 'Utilities' :
      raw === 'ETF'                   ? 'ETFs / Commodities' :
      raw || 'Other';
    if (!subsectorGroups[label]) subsectorGroups[label] = [];
    subsectorGroups[label].push({ symbol: w.symbol, signal: d?.signal ?? 'WATCH' });
  }
  const sortedGroups = Object.entries(subsectorGroups).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="flex gap-6">
      {/* ── Main content (left) ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
      {/* ── Sync / Recover panel ──────────────────────────────────────────────── */}
      <div className="mb-5">
        <button
          onClick={() => { setShowSync(v => !v); }}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Sync / Recover watchlist
          <svg className={`h-3 w-3 transition-transform ${showSync ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showSync && (
          <div className="mt-3 rounded-xl border border-gray-700/60 bg-gray-900/80 p-4">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-gray-700/60 pb-3">
              {([
                { id: 'custom',  label: '🔑 My Code' },
                { id: 'code',    label: '📱 Device Code' },
                { id: 'recover', label: '🔍 Recover' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSyncTab(tab.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                    syncTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab: My Code ───────────────────────────────────────────────── */}
            {syncTab === 'custom' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-300 font-medium">
                  Set a memorable personal code (e.g. <span className="font-mono text-blue-400">MYWATCH</span> or <span className="font-mono text-blue-400">JERIC2024</span>).
                  Use the same code on any device to instantly load your watchlist — even after a browser wipe.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={customCodeInput}
                    onChange={e => { setCustomCodeInput(e.target.value.toUpperCase().replace(/\s+/g, '_').slice(0, 20)); setCustomCodeStatus('idle'); setCustomCodeMsg(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleCustomCode()}
                    placeholder="e.g. JERIC2024"
                    maxLength={20}
                    className="font-mono flex-1 min-w-0 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none uppercase tracking-wider"
                  />
                  <button
                    onClick={handleCustomCode}
                    disabled={customCodeStatus === 'loading' || customCodeInput.length < 4}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
                  >
                    {customCodeStatus === 'loading' ? 'Saving…' : 'Set / Load Code'}
                  </button>
                </div>
                {customCodeMsg && (
                  <p className={`text-xs ${customCodeStatus === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {customCodeMsg}
                  </p>
                )}
                <p className="text-[11px] text-gray-600">
                  If you already set a code before, entering it again will reload your stocks. 4–20 characters, letters and numbers only.
                </p>
              </div>
            )}

            {/* ── Tab: Device Code ───────────────────────────────────────────── */}
            {syncTab === 'code' && (
              <div className="space-y-4">
                {/* This device's auto code */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Your auto-generated device code:</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-base font-bold tracking-widest text-white bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 select-all">
                      {syncCode || '—'}
                    </span>
                    <button
                      onClick={() => syncCode && navigator.clipboard?.writeText(syncCode).catch(() => {})}
                      className="text-xs text-blue-400 hover:text-blue-300 border border-blue-700/40 rounded-lg px-3 py-2 transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                {/* Enter another device's code */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Enter code from another device to load that watchlist:</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={syncInput}
                      onChange={e => { setSyncInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)); setSyncStatus('idle'); setSyncMsg(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleSync()}
                      placeholder="e.g. A3F8B21C"
                      maxLength={8}
                      className="font-mono w-36 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none tracking-widest uppercase"
                    />
                    <button
                      onClick={handleSync}
                      disabled={syncStatus === 'loading' || syncInput.length !== 8}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {syncStatus === 'loading' ? 'Loading…' : 'Load'}
                    </button>
                  </div>
                  {syncMsg && (
                    <p className={`text-xs mt-2 ${syncStatus === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{syncMsg}</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Recover ───────────────────────────────────────────────── */}
            {syncTab === 'recover' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-300">
                  Lost your watchlist? Enter a stock symbol you know was in it — we&apos;ll search for your saved data.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={recoverSymbol}
                    onChange={e => { setRecoverSymbol(e.target.value.toUpperCase()); setRecoverStatus('idle'); setRecoverMsg(''); setRecoverResults([]); }}
                    onKeyDown={e => e.key === 'Enter' && handleRecover()}
                    placeholder="e.g. AAPL"
                    maxLength={6}
                    className="font-mono w-28 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none uppercase"
                  />
                  <button
                    onClick={handleRecover}
                    disabled={recoverStatus === 'loading' || !recoverSymbol.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {recoverStatus === 'loading' ? 'Searching…' : 'Search'}
                  </button>
                </div>

                {recoverMsg && (
                  <p className={`text-xs ${recoverStatus === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{recoverMsg}</p>
                )}

                {recoverResults.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-gray-400">Found {recoverResults.length} watchlist{recoverResults.length !== 1 ? 's' : ''} — pick yours:</p>
                    {recoverResults.map(r => (
                      <div key={r.deviceId} className="flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2">
                        <div>
                          <p className="text-xs text-white font-medium">{r.count} stocks — {r.symbols.slice(0, 6).join(', ')}{r.count > 6 ? '…' : ''}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Code: <span className="font-mono">{r.syncCode}</span></p>
                        </div>
                        <button
                          onClick={() => handleRestoreResult(r)}
                          className="shrink-0 rounded-lg bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add ticker input */}
      <div className="mb-6">
        <div className="flex gap-2 max-w-sm flex-wrap sm:flex-nowrap">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value.toUpperCase()); setAddError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && !adding && handleAdd()}
            placeholder="e.g. AMZN; TSLA; NVDA"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none uppercase"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 whitespace-nowrap"
          >
            {adding ? (
              <>
                <svg className="h-4 w-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                {addProgress ? `${addProgress[0]}/${addProgress[1]}` : 'Adding…'}
              </>
            ) : (
              <>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </>
            )}
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

      {dbLoading && (
        <div className="flex items-center justify-center py-16 text-gray-500 text-sm gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading your watchlist…
        </div>
      )}

      {!dbLoading && watchlist.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-700 p-12 text-center text-gray-500">
          <p className="text-sm">Your watchlist is empty.</p>
          <p className="text-xs mt-1">Add a ticker above to get started.</p>
        </div>
      )}
      </div>{/* end main content */}

      {/* ── Subsector sidebar (right) ─────────────────────────────────────── */}
      {watchlist.length > 0 && (
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-4 rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-800 bg-gray-900/80">
              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">By Sector</p>
              <p className="text-[10px] text-gray-600">{watchlist.length} stocks · {sortedGroups.length} sectors</p>
            </div>
            {/* Legend — at the top so it's always visible */}
            <div className="px-3 py-2 border-b border-gray-800 bg-gray-900/40 flex flex-wrap gap-x-3 gap-y-0.5">
              {[
                { color: 'bg-emerald-900/60 text-emerald-300', label: 'Breakout' },
                { color: 'bg-blue-900/60 text-blue-300',       label: 'Pullback' },
                { color: 'bg-gray-700/60 text-gray-400',       label: 'Watch' },
                { color: 'bg-purple-900/60 text-purple-300',   label: 'Mean Revert' },
                { color: 'bg-red-900/60 text-red-300',         label: 'Avoid' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className={`text-[9px] px-1 rounded font-mono ${color}`}>■</span>
                  <span className="text-[9px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
            <div className="p-2 space-y-1 max-h-[75vh] overflow-y-auto scrollbar-none">
              {sortedGroups.length === 0 ? (
                <p className="text-[10px] text-gray-600 px-2 py-3">Loading sector data…</p>
              ) : (
                sortedGroups.map(([sector, items]) => (
                  <div key={sector} className="rounded-lg bg-gray-800/40 px-2.5 py-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 truncate">{sector}</p>
                    <div className="flex flex-wrap gap-1">
                      {items.map(({ symbol, signal }) => (
                        <a
                          key={symbol}
                          href={`/stock/${symbol}`}
                          className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded transition hover:opacity-80 ${
                            signal === 'BREAKOUT'    ? 'bg-emerald-900/60 text-emerald-300' :
                            signal === 'PULLBACK'    ? 'bg-blue-900/60   text-blue-300'    :
                            signal === 'AVOID'       ? 'bg-red-900/60    text-red-300'     :
                            signal === 'MEAN_REVERT' ? 'bg-purple-900/60 text-purple-300'  :
                            'bg-gray-700/60 text-gray-400'
                          }`}
                        >
                          {symbol}
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
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

      {/* Latest headline — live from Finnhub, lazy-loaded */}
      <StockHeadline symbol={data.symbol} companyName={item.name} />

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
