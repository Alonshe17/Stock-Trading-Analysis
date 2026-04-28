/**
 * Price Alerts — Supabase-backed storage.
 * All functions are async and use the browser Supabase client.
 * The device_id (random UUID in localStorage) identifies the user anonymously.
 */

import { createBrowserSupabaseClient as createClient } from '@/lib/supabaseBrowser';
import { getDeviceId } from '@/lib/deviceId';

export type PriceAlert = {
  id: string;
  symbol: string;
  name: string;
  highTarget: number | null;
  lowTarget:  number | null;
  createdAt:  number;
  triggeredHigh: boolean;
  triggeredLow:  boolean;
  active: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAlert(row: any): PriceAlert {
  return {
    id:            row.id,
    symbol:        row.symbol,
    name:          row.name,
    highTarget:    row.high_target   ?? null,
    lowTarget:     row.low_target    ?? null,
    createdAt:     new Date(row.created_at).getTime(),
    triggeredHigh: row.triggered_high ?? false,
    triggeredLow:  row.triggered_low  ?? false,
    active:        row.active ?? true,
  };
}

export async function getAlerts(): Promise<PriceAlert[]> {
  const { data } = await createClient()
    .from('price_alerts')
    .select('*')
    .eq('device_id', getDeviceId())
    .order('created_at', { ascending: false });

  return (data ?? []).map(rowToAlert);
}

export async function getAlert(symbol: string): Promise<PriceAlert | null> {
  const { data } = await createClient()
    .from('price_alerts')
    .select('*')
    .eq('device_id', getDeviceId())
    .eq('symbol', symbol)
    .maybeSingle();

  return data ? rowToAlert(data) : null;
}

export async function upsertAlert(
  alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggeredHigh' | 'triggeredLow' | 'active'>,
): Promise<boolean> {
  const { error } = await createClient()
    .from('price_alerts')
    .upsert(
      {
        device_id:      getDeviceId(),
        symbol:         alert.symbol,
        name:           alert.name,
        high_target:    alert.highTarget,
        low_target:     alert.lowTarget,
        triggered_high: false,
        triggered_low:  false,
        active:         true,
        updated_at:     new Date().toISOString(),
      },
      { onConflict: 'device_id,symbol' },
    );

  return !error;
}

export async function removeAlert(symbol: string): Promise<void> {
  await createClient()
    .from('price_alerts')
    .delete()
    .eq('device_id', getDeviceId())
    .eq('symbol', symbol);
}

export async function markTriggered(symbol: string, side: 'high' | 'low'): Promise<void> {
  const col = side === 'high' ? 'triggered_high' : 'triggered_low';
  await createClient()
    .from('price_alerts')
    .update({ [col]: true, updated_at: new Date().toISOString() })
    .eq('device_id', getDeviceId())
    .eq('symbol', symbol);
}
