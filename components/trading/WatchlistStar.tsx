'use client';

/**
 * WatchlistStar — compact icon-only bookmark button for scanner tables.
 * Reads/writes both localStorage AND Supabase so additions are immediately
 * visible on the Watchlist page (which reads from Supabase).
 */

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabaseBrowser';
import { getDeviceId } from '@/lib/deviceId';

const STORAGE_KEY = 'swingmonitor_watchlist';

interface Props {
  symbol: string;
  name:   string;
}

export function WatchlistStar({ symbol, name }: Props) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const list: { symbol: string }[] = JSON.parse(raw);
        setAdded(list.some(w => w.symbol === symbol));
      }
    } catch { /* ignore */ }
  }, [symbol]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation(); // don't expand/collapse the row

    const raw  = localStorage.getItem(STORAGE_KEY);
    const list: { symbol: string; name: string; type: string }[] = (() => {
      try { return raw ? JSON.parse(raw) : []; } catch { return []; }
    })();

    if (added) {
      // Remove from localStorage immediately
      const next = list.filter(w => w.symbol !== symbol);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      setAdded(false);
      // Remove from Supabase (fire-and-forget)
      void (async () => {
        try {
          const sb = createBrowserSupabaseClient();
          await sb.from('watchlist').delete()
            .eq('device_id', getDeviceId()).eq('symbol', symbol);
        } catch { /* ignore */ }
      })();
    } else {
      // Add to localStorage immediately
      if (!list.some(w => w.symbol === symbol)) {
        list.push({ symbol, name, type: 'stock' });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
      }
      setAdded(true);
      // Add to Supabase (fire-and-forget)
      void (async () => {
        try {
          const sb = createBrowserSupabaseClient();
          await sb.from('watchlist').upsert(
            { device_id: getDeviceId(), symbol, name, type: 'stock', added_at: new Date().toISOString() },
            { onConflict: 'device_id,symbol' },
          );
        } catch { /* ignore */ }
      })();
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={added ? 'Remove from watchlist' : 'Add to watchlist'}
      className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded transition-colors ${
        added
          ? 'text-emerald-400 hover:text-red-400'
          : 'text-gray-600 hover:text-blue-400'
      }`}
    >
      {added ? (
        // Filled bookmark
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 3a2 2 0 00-2 2v16l9-4 9 4V5a2 2 0 00-2-2H5z" />
        </svg>
      ) : (
        // Outline bookmark
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3a2 2 0 00-2 2v16l9-4 9 4V5a2 2 0 00-2-2H5z" />
        </svg>
      )}
    </button>
  );
}
