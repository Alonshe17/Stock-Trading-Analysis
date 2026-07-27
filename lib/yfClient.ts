/**
 * Yahoo Finance HTTP client with automatic crumb + cookie management.
 *
 * Yahoo Finance requires a valid session crumb for all v7/v10/quoteSummary
 * endpoints. Without it, server-side requests from Vercel return empty data
 * or 401 errors. This module fetches and caches the crumb once per function
 * instance, then injects it into every API call.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Module-level cache — lives for the lifetime of the serverless function instance
let _crumb  = '';
let _cookie = '';
let _ready  = false;

function _timedFetch(url: string, opts: RequestInit, ms = 5000): Promise<Response> {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

/** Fetch and cache the YF session crumb + cookie. Safe to call multiple times. */
export async function ensureYFSession(): Promise<void> {
  if (_ready) return;

  try {
    // ── Step 1: Visit Yahoo Finance to get session cookies ──────────────────
    const r1 = await _timedFetch('https://finance.yahoo.com/', {
      headers: {
        'User-Agent'     : UA,
        'Accept'         : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control'  : 'no-cache',
        'Pragma'         : 'no-cache',
      },
      redirect: 'follow',
    }, 6000);

    // Parse Set-Cookie header into a single Cookie string
    const raw = r1.headers.get('set-cookie') ?? '';
    _cookie = raw
      .split(/,(?=[A-Za-z0-9_%-]+=)/)       // split on cookie boundaries
      .map(c => c.trim().split(';')[0].trim())
      .filter(Boolean)
      .join('; ');

    // ── Step 2: Exchange cookie for crumb ────────────────────────────────────
    const r2 = await _timedFetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent'     : UA,
        'Accept'         : 'text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer'        : 'https://finance.yahoo.com/',
        'Cookie'         : _cookie,
      },
    }, 5000);

    if (r2.ok) {
      const text = (await r2.text()).trim();
      // Crumb is a short alphanumeric string (not JSON, not HTML)
      if (text && text.length < 30 && !text.startsWith('{') && !text.startsWith('<')) {
        _crumb = text;
      }
    }

    // ── Fallback: try query1 crumb endpoint ──────────────────────────────────
    if (!_crumb) {
      const r3 = await _timedFetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
        headers: { 'User-Agent': UA, Cookie: _cookie },
      }, 5000);
      if (r3.ok) {
        const text = (await r3.text()).trim();
        if (text && text.length < 30 && !text.startsWith('{')) {
          _crumb = text;
        }
      }
    }
  } catch {
    // Proceed without crumb — v8/chart endpoints often still work
  }

  _ready = true;
}

/** Build headers for a Yahoo Finance API request. */
export function yfHeaders(): Record<string, string> {
  return {
    'User-Agent'     : UA,
    'Accept'         : 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer'        : 'https://finance.yahoo.com/',
    ...(_cookie ? { Cookie: _cookie } : {}),
  };
}

/** Append crumb query param to a URL if we have one. */
export function withCrumb(url: string): string {
  if (!_crumb) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}crumb=${encodeURIComponent(_crumb)}`;
}

/** Normalize dot-notation tickers for the YF API (BRK.B → BRK-B). */
export function yfSym(s: string): string {
  if (s === 'BRK.B') return 'BRK-B';
  if (s === 'BF.B')  return 'BF-B';
  return s;
}

/** Whether we successfully obtained a crumb. */
export function hasCrumb(): boolean { return _crumb.length > 0; }
