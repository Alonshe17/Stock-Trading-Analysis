'use client';

import { useState, useEffect, useRef } from 'react';
import { getAlert, upsertAlert, removeAlert, type PriceAlert } from '@/lib/priceAlerts';

type Props = { symbol: string; name: string; currentPrice: number };

export function PriceAlertBell({ symbol, name, currentPrice }: Props) {
  const [open, setOpen] = useState(false);
  const [alert, setAlert] = useState<PriceAlert | null>(null);
  const [high, setHigh] = useState('');
  const [low, setLow] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAlert(symbol).then((a) => {
      setAlert(a);
      if (a) {
        setHigh(a.highTarget?.toString() ?? '');
        setLow(a.lowTarget?.toString() ?? '');
      }
    });
  }, [symbol, open]);

  // Close on outside click/touch (desktop dropdown)
  useEffect(() => {
    function handler(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  // Lock body scroll when modal open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function handleSave() {
    const highNum = parseFloat(high) || null;
    const lowNum  = parseFloat(low)  || null;
    if (!highNum && !lowNum) return;
    const ok = await upsertAlert({ symbol, name, highTarget: highNum, lowTarget: lowNum });
    if (ok) {
      setAlert(await getAlert(symbol));
      setSaveError(false);
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
    } else {
      setSaveError(true);
    }
  }

  async function handleRemove() {
    await removeAlert(symbol);
    setAlert(null);
    setHigh('');
    setLow('');
    setOpen(false);
  }

  const hasAlert = alert?.active;

  const panel = (
    <div className="rounded-xl border border-gray-700 bg-gray-900 shadow-2xl p-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold text-white text-sm">{symbol} Price Alert</div>
          <div className="text-xs text-gray-500">Current: ${currentPrice.toFixed(2)}</div>
        </div>
        <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-400 p-1">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            <span className="text-emerald-400">▲</span> Alert when price rises above
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={high}
              onChange={(e) => setHigh(e.target.value)}
              placeholder={`e.g. ${(currentPrice * 1.05).toFixed(2)}`}
              className="flex-1 rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">
            <span className="text-red-400">▼</span> Alert when price falls below
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={low}
              onChange={(e) => setLow(e.target.value)}
              placeholder={`e.g. ${(currentPrice * 0.95).toFixed(2)}`}
              className="flex-1 rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Status indicators */}
      {alert && (
        <div className="flex gap-2 mb-3 text-xs flex-wrap">
          {alert.highTarget && (
            <span className={`px-2 py-0.5 rounded border ${alert.triggeredHigh ? 'border-amber-700 bg-amber-900/30 text-amber-400' : 'border-gray-700 text-gray-400'}`}>
              {alert.triggeredHigh ? '⚡ Triggered ▲ $' + alert.highTarget : `▲ $${alert.highTarget}`}
            </span>
          )}
          {alert.lowTarget && (
            <span className={`px-2 py-0.5 rounded border ${alert.triggeredLow ? 'border-amber-700 bg-amber-900/30 text-amber-400' : 'border-gray-700 text-gray-400'}`}>
              {alert.triggeredLow ? '⚡ Triggered ▼ $' + alert.lowTarget : `▼ $${alert.lowTarget}`}
            </span>
          )}
        </div>
      )}

      {/* Re-arm hint when alert has triggered */}
      {alert && (alert.triggeredHigh || alert.triggeredLow) && (
        <p className="text-xs text-amber-400/80 mb-3">
          ⚡ Target was hit. Click &quot;Update Alert&quot; to re-arm monitoring.
        </p>
      )}

      {saveError && (
        <p className="text-xs text-red-400 mb-3">
          ⚠ Could not save — your browser may have storage disabled (e.g. private mode).
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!high && !low}
          className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition"
        >
          {saved ? '✓ Saved!' : hasAlert ? 'Update Alert' : 'Set Alert'}
        </button>
        {hasAlert && (
          <button
            onClick={handleRemove}
            className="rounded border border-red-800/60 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 transition"
          >
            Remove
          </button>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-3">
        Alerts are saved to the cloud — available on any device.
      </p>
    </div>
  );

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={hasAlert ? 'Alert set — click to edit' : 'Set price alert'}
        className={`rounded p-1.5 transition ${hasAlert ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-gray-300'}`}
      >
        <svg className="h-4 w-4" fill={hasAlert ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </button>

      {open && (
        <>
          {/* ── Mobile: full-screen centered modal ── */}
          <div className="sm:hidden fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="relative w-full max-w-sm">
              {panel}
            </div>
          </div>

          {/* ── Desktop: dropdown anchored to the button ── */}
          <div className="hidden sm:block absolute right-0 top-8 z-50 w-72">
            {panel}
          </div>
        </>
      )}
    </div>
  );
}
