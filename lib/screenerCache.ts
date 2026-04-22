/**
 * Screener Cache — Supabase-backed daily cache for the large-cap screener.
 *
 * The Vercel cron job runs at 23:00 UTC (= 7AM SGT T+1) on weekdays and
 * writes the day's results here. The screener page reads from cache and
 * only falls back to a live run if no cache exists for today's SGT date.
 *
 * Table (run once in Supabase SQL editor):
 *
 *   create table if not exists screener_cache (
 *     cache_date text primary key,       -- SGT date, e.g. "2024-04-23"
 *     market_regime text not null,
 *     results jsonb not null,
 *     refreshed_at timestamptz default now()
 *   );
 *
 *   -- Allow anonymous reads and writes (no user auth needed for this table)
 *   alter table screener_cache enable row level security;
 *   create policy "public read"  on screener_cache for select using (true);
 *   create policy "public write" on screener_cache for insert with check (true);
 *   create policy "public upsert" on screener_cache for update using (true);
 */

import { isSupabaseConfigured, createServerSupabaseClient } from './supabase';
import type { ScreenerEntry } from './screener';

export type ScreenerCacheRow = {
  cache_date: string;
  market_regime: string;
  results: ScreenerEntry[];
  refreshed_at: string;
};

/** Returns today's date in SGT (UTC+8) as "YYYY-MM-DD". */
export function getSGTDate(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/** Format a UTC ISO string as a human-readable SGT time, e.g. "7:02 AM SGT" */
export function formatSGTTime(isoString: string): string {
  return new Date(isoString).toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Read today's screener cache from Supabase.
 * Returns null if Supabase is not configured, no cache exists, or it fails.
 */
export async function getScreenerCache(dateStr: string): Promise<ScreenerCacheRow | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('screener_cache')
      .select('*')
      .eq('cache_date', dateStr)
      .single();
    if (error || !data) return null;
    return data as ScreenerCacheRow;
  } catch {
    return null;
  }
}

/**
 * Write (upsert) screener results for a given SGT date into Supabase.
 * Returns true on success.
 */
export async function setScreenerCache(
  dateStr: string,
  marketRegime: string,
  results: ScreenerEntry[],
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('screener_cache')
      .upsert({
        cache_date: dateStr,
        market_regime: marketRegime,
        results,
        refreshed_at: new Date().toISOString(),
      }, { onConflict: 'cache_date' });
    return !error;
  } catch {
    return false;
  }
}
