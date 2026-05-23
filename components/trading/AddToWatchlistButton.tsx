'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabaseBrowser';
import { getDeviceId } from '@/lib/deviceId';

const STORAGE_KEY = 'swingmonitor_watchlist';

interface Props {
  symbol: string;
  name: string;
}

export function AddToWatchlistButton({ symbol, name }: Props) {
  // Start false on both server + client to avoid hydration mismatch
  const [added, setAdded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const list: { symbol: string }[] = JSON.parse(saved);
        setAdded(list.some((w) => w.symbol === symbol));
      }
    } catch { /* ignore */ }
  }, [symbol]);

  function handleAdd() {
    try {
      // 1. Write to localStorage immediately (instant UI feedback)
      const saved = localStorage.getItem(STORAGE_KEY);
      const list: { symbol: string; name: string; type: string }[] = saved ? JSON.parse(saved) : [];
      if (list.some((w) => w.symbol === symbol)) return;
      list.push({ symbol, name, type: 'stock' });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      setAdded(true);
    } catch { /* ignore */ }

    // 2. Also write to Supabase so the watchlist page sees it (fire-and-forget)
    void (async () => {
      try {
        const sb = createBrowserSupabaseClient();
        const deviceId = getDeviceId();
        await sb.from('watchlist').upsert(
          { device_id: deviceId, symbol, name, type: 'stock', added_at: new Date().toISOString() },
          { onConflict: 'device_id,symbol' },
        );
      } catch { /* ignore — localStorage already written */ }
    })();
  }

  if (added) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-emerald-900/40 text-emerald-400 border border-emerald-700/50">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        In Watchlist
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      title="Add to watchlist"
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-gray-700 bg-gray-800 text-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition"
    >
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      + Watchlist
    </button>
  );
}
