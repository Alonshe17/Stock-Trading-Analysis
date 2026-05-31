/**
 * Generates and persists a stable anonymous device ID used as the Supabase
 * "user" identifier for all watchlist rows.
 *
 * Stored in TWO places to survive accidental data loss:
 *   1. localStorage  — fast primary read
 *   2. Cookie        — survives localStorage.clear() / browser cache wipes
 *
 * The ID is only truly lost if the user explicitly chooses
 * "Clear all site data" in browser settings (which deletes both).
 *
 * Cross-device sync:
 *   A user can call setDeviceId(code) to adopt another device's ID so both
 *   devices share the exact same Supabase watchlist rows.
 */

const LS_KEY      = 'swingmonitor_device_id';
const COOKIE_KEY  = 'swingmonitor_did';
const COOKIE_DAYS = 730; // 2 years

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie
      .split(';')
      .find(c => c.trim().startsWith(name + '='));
    return match ? decodeURIComponent(match.trim().slice(name.length + 1)) : null;
  } catch { return null; }
}

function setCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  try {
    const exp = new Date();
    exp.setDate(exp.getDate() + COOKIE_DAYS);
    document.cookie =
      `${name}=${encodeURIComponent(value)};` +
      `expires=${exp.toUTCString()};` +
      `path=/;SameSite=Lax`;
  } catch { /* ignore */ }
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    // 1. Try localStorage (fastest path, most common)
    const fromLS = localStorage.getItem(LS_KEY);
    if (fromLS) {
      setCookie(COOKIE_KEY, fromLS); // keep cookie in sync
      return fromLS;
    }

    // 2. localStorage was cleared — recover from cookie
    const fromCookie = getCookie(COOKIE_KEY);
    if (fromCookie) {
      localStorage.setItem(LS_KEY, fromCookie); // restore localStorage
      return fromCookie;
    }

    // 3. First ever visit — generate new ID, persist to both
    const newId = crypto.randomUUID();
    localStorage.setItem(LS_KEY, newId);
    setCookie(COOKIE_KEY, newId);
    return newId;
  } catch {
    return 'anon';
  }
}

/**
 * Adopt a different device ID (e.g. from a sync code entered by the user).
 * Overwrites both localStorage and the cookie so all future operations
 * (reads, writes, deletes) use this ID — effectively sharing the watchlist
 * of whichever device originally had this ID.
 */
export function setDeviceId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, id);
    setCookie(COOKIE_KEY, id);
  } catch { /* ignore */ }
}

/**
 * Returns a short 8-char sync code the user can share with another device.
 * It is just the first 8 characters of the UUID (uppercase, no dashes) —
 * unique enough for personal use, easy to type on mobile.
 */
export function getSyncCode(): string {
  const id = getDeviceId();
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  // Take first two segments (8 + 4 chars = 12) and uppercase them
  return id.replace(/-/g, '').substring(0, 8).toUpperCase();
}

/**
 * Given a full device_id from Supabase that starts with the sync code,
 * confirm it matches.
 */
export function syncCodeMatches(code: string, deviceId: string): boolean {
  return deviceId.replace(/-/g, '').toUpperCase().startsWith(code.toUpperCase());
}
