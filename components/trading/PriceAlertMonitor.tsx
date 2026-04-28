'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getAlerts, markTriggered, type PriceAlert } from '@/lib/priceAlerts';

type Toast = { id: number; message: string; type: 'high' | 'low' };

export function PriceAlertMonitor() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastId = useRef(0);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermissionState(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setPermissionState);
      }
    }
  }, []);

  const addToast = useCallback((message: string, type: 'high' | 'low') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 8000);
  }, []);

  const fireNotification = useCallback((alert: PriceAlert, price: number, side: 'high' | 'low') => {
    const emoji = side === 'high' ? '🟢' : '🔴';
    const direction = side === 'high' ? 'risen above' : 'fallen below';
    const target = side === 'high' ? alert.highTarget : alert.lowTarget;
    const message = `${emoji} ${alert.symbol} has ${direction} $${target} — now at $${price.toFixed(2)}`;

    // Browser notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`SwingMonitor Alert — ${alert.symbol}`, {
        body: message,
        icon: '/favicon.svg',
        tag: `${alert.symbol}-${side}`,
      });
    }

    // In-app toast
    addToast(message, side);

    // Mark as triggered so it doesn't fire again
    markTriggered(alert.symbol, side);
  }, [addToast]);

  const checkPrices = useCallback(async () => {
    const alerts = (await getAlerts()).filter((a) => a.active);
    if (alerts.length === 0) return;

    // Only check alerts that haven't fully triggered yet
    const pending = alerts.filter(
      (a) => (a.highTarget && !a.triggeredHigh) || (a.lowTarget && !a.triggeredLow),
    );
    if (pending.length === 0) return;

    // Check each pending alert
    await Promise.all(
      pending.map(async (alert) => {
        try {
          const res = await fetch(`/api/stocks/quote?symbol=${alert.symbol}`);
          if (!res.ok) return;
          const { price } = await res.json();
          if (!price) return;

          if (alert.highTarget && !alert.triggeredHigh && price >= alert.highTarget) {
            fireNotification(alert, price, 'high');
          }
          if (alert.lowTarget && !alert.triggeredLow && price <= alert.lowTarget) {
            fireNotification(alert, price, 'low');
          }
        } catch {
          // silently ignore network errors
        }
      }),
    );
  }, [fireNotification]);

  // Poll every 60 seconds
  useEffect(() => {
    checkPrices(); // immediate first check
    intervalRef.current = setInterval(checkPrices, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkPrices]);

  // Permission banner
  const showBanner = permissionState === 'default';

  return (
    <>
      {/* Permission request banner */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 rounded-xl border border-amber-700/50 bg-gray-900 p-4 shadow-2xl">
          <p className="text-sm text-gray-200 font-medium mb-1">Enable price alert notifications</p>
          <p className="text-xs text-gray-400 mb-3">Get notified when your stocks hit your target price, even if you switch tabs.</p>
          <button
            onClick={() => Notification.requestPermission().then(setPermissionState)}
            className="w-full rounded bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-500 transition"
          >
            Allow Notifications
          </button>
        </div>
      )}

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border px-4 py-3 shadow-2xl text-sm font-medium animate-in slide-in-from-right pointer-events-auto
              ${t.type === 'high'
                ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100'
                : 'bg-red-900/90 border-red-700 text-red-100'
              }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
