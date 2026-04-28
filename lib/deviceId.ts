/**
 * Generates and persists a random UUID in localStorage.
 * This acts as the anonymous "user" identifier for all Supabase rows.
 *
 * Survives: browser cache clears, cookie wipes, incognito sessions ending.
 * Lost only if the user explicitly clears ALL site data for the domain.
 */

const KEY = 'swingmonitor_device_id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}
