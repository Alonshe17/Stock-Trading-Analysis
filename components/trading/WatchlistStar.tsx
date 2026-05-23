'use client';

/**
 * WatchlistStar — compact icon-only bookmark button for scanner tables.
 * Reads/writes the same localStorage key as AddToWatchlistButton so both
 * components stay in sync automatically.
 */

import { useState, useEffect } from 'react';

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
    try {
      const raw  = localStorage.getItem(STORAGE_KEY);
      const list: { symbol: string; name: string; type: string }[] = raw ? JSON.parse(raw) : [];
      if (added) {
        // Remove
        const next = list.filter(w => w.symbol !== symbol);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setAdded(false);
      } else {
        // Add
        if (!list.some(w => w.symbol === symbol)) {
          list.push({ symbol, name, type: 'stock' });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        }
        setAdded(true);
      }
    } catch { /* ignore */ }
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
