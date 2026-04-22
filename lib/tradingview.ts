/**
 * TradingView Scanner API
 * Uses the public scanner endpoint to fetch technical recommendations and sector data.
 *
 * Recommend.All — float from -1 (Strong Sell) to +1 (Strong Buy)
 * sector        — TradingView sector classification (Technology, Finance, etc.)
 */

const TV_SCANNER_URL = 'https://scanner.tradingview.com/america/scan';

// TradingView requires browser-like headers or it rejects server-side requests
const TV_HEADERS = {
  'Content-Type': 'application/json',
  'Origin': 'https://www.tradingview.com',
  'Referer': 'https://www.tradingview.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function tvLabel(value: number): string {
  if (value >= 0.5)  return 'Strong Buy';
  if (value >= 0.1)  return 'Buy';
  if (value > -0.1)  return 'Neutral';
  if (value > -0.5)  return 'Sell';
  return 'Strong Sell';
}

export type TVData = {
  tvRating: string | null;
  sector: string | null;
};

/**
 * Fetch TradingView technical ratings AND sector for a list of symbols in ONE request.
 * Returns a Map<SYMBOL_UPPERCASE, TVData>.
 *
 * Uses filter type=stock + range 5000 to reliably cover the full US equity universe
 * without hitting TradingView's undocumented size limits.
 */
export async function fetchTVDataBatch(
  symbols: string[],
): Promise<Map<string, TVData>> {
  const map = new Map<string, TVData>();
  if (symbols.length === 0) return map;

  const symbolSet = new Set(symbols.map((s) => s.toUpperCase()));

  try {
    const res = await fetch(TV_SCANNER_URL, {
      method: 'POST',
      headers: TV_HEADERS,
      body: JSON.stringify({
        filter: [{ left: 'type', operation: 'equal', right: 'stock' }],
        columns: ['name', 'Recommend.All', 'sector'],
        range: [0, 5000],
      }),
      cache: 'no-store',
    });

    if (!res.ok) return map;

    const data = await res.json();

    for (const row of data.data ?? []) {
      const sym: string    = row.d?.[0];
      const rec: unknown   = row.d?.[1];
      const sector: string = row.d?.[2];

      if (sym && symbolSet.has(sym.toUpperCase())) {
        map.set(sym.toUpperCase(), {
          tvRating: typeof rec === 'number' ? tvLabel(rec) : null,
          sector:   sector ?? null,
        });
      }
    }
  } catch {
    // Silently return empty map — callers handle null gracefully
  }

  return map;
}

/**
 * Fetch TradingView technical rating for a single symbol.
 * Used for one-off lookups (individual stock page).
 */
export async function fetchTVRating(symbol: string): Promise<string | null> {
  try {
    const res = await fetch(TV_SCANNER_URL, {
      method: 'POST',
      headers: TV_HEADERS,
      body: JSON.stringify({
        filter: [{ left: 'name', operation: 'equal', right: symbol.toUpperCase() }],
        columns: ['name', 'Recommend.All'],
        range: [0, 1],
      }),
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const data = await res.json();
    const rec: unknown = data.data?.[0]?.d?.[1];
    if (typeof rec !== 'number') return null;
    return tvLabel(rec);
  } catch {
    return null;
  }
}
