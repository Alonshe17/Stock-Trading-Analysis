/**
 * Earnings Calendar Scanner
 *
 * Fetches upcoming earnings from Yahoo Finance's earnings calendar endpoint
 * for each trading day in [startDate, startDate + days].
 *
 * For each date, paginates through all reporting stocks, filters to
 * simple US tickers (A–Z, 1–5 chars), then batch-quotes them for
 * current price / volume / market-cap data.
 *
 * Results are sorted by date (soonest first), then by market cap within
 * each date (largest company first so the most-watched names are at the top).
 */

import { ensureYFSession, yfHeaders, withCrumb } from './yfClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type EarningsTimeOfDay = 'BMO' | 'AMC' | 'TNS';
// BMO = Before Market Open · AMC = After Market Close · TNS = Time Not Specified

export type EarningsResult = {
  symbol:           string;
  name:             string;
  earningsDate:     string;       // YYYY-MM-DD
  earningsDateLabel: string;      // "Mon 6/3"
  daysUntil:        number;       // calendar days from startDate
  timeOfDay:        EarningsTimeOfDay;
  epsEstimate:      number | null;
  price:            number;
  changePct:        number;
  volume:           number;
  avgVolume:        number;
  marketCapM:       number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const CLEAN_TICKER = /^[A-Z]{1,5}$/;

/** Convert a YYYY-MM-DD string to "Mon 6/3" display label. */
function toLabel(dateStr: string): string {
  const [yr, mo, dy] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(yr, mo - 1, dy));
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()];
  return `${day} ${mo}/${dy}`;
}

/** Fetch all earnings entries for a single date from YF calendar API. */
async function fetchEarningsForDate(date: string): Promise<Array<{
  symbol:      string;
  name:        string;
  earningsDate: string;
  timeOfDay:   EarningsTimeOfDay;
  epsEstimate: number | null;
}>> {
  const rows: ReturnType<typeof fetchEarningsForDate> extends Promise<infer T> ? T : never = [];
  const size = 100;

  for (let offset = 0; offset < 400; offset += size) {
    let fetched = false;
    for (const host of ['query2', 'query1']) {
      const url =
        `https://${host}.finance.yahoo.com/v1/finance/earning` +
        `?date=${date}&offset=${offset}&size=${size}&lang=en-US&region=US`;
      try {
        const r = await fetch(withCrumb(url), { headers: yfHeaders(), cache: 'no-store' });
        if (!r.ok) continue;
        const json = await r.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const earningsObj = json?.finance?.result?.[0]?.earnings as any;
        if (!earningsObj) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageRows: any[] = earningsObj.rows ?? [];
        const total: number   = earningsObj.total ?? 0;

        for (const row of pageRows) {
          const sym = (row.ticker as string | undefined)?.toUpperCase().trim() ?? '';
          if (!CLEAN_TICKER.test(sym)) continue; // skip non-US / multi-class tickers

          const sdt = (row.startdatetimetype as string | undefined) ?? 'TNS';
          const timeOfDay: EarningsTimeOfDay =
            sdt === 'AMC' ? 'AMC' : sdt === 'BMO' ? 'BMO' : 'TNS';

          rows.push({
            symbol:       sym,
            name:         (row.companyshortname as string | undefined) ?? sym,
            earningsDate: date,
            timeOfDay,
            epsEstimate:  row.epsestimate != null ? Number(row.epsestimate) : null,
          });
        }

        fetched = true;
        // Stop paginating if we've fetched everything
        if (offset + size >= total || pageRows.length < size) return rows;
        break; // got results from this host — move to next page
      } catch { /* try next host */ }
    }
    if (!fetched) break; // both hosts failed — stop pagination
  }

  return rows;
}

/** Batch-quote a list of symbols → price, change%, volume, market cap. */
async function batchQuoteAll(symbols: string[]): Promise<Map<string, {
  price: number; changePct: number; volume: number;
  avgVolume: number; marketCapM: number;
}>> {
  const map = new Map<string, { price: number; changePct: number; volume: number; avgVolume: number; marketCapM: number }>();
  const fields = 'regularMarketPrice,regularMarketChangePercent,regularMarketVolume,averageDailyVolume3Month,marketCap';

  for (let i = 0; i < symbols.length; i += 100) {
    const chunk = symbols.slice(i, i + 100);
    const syms  = chunk.join(',');
    for (const host of ['query2', 'query1']) {
      const url =
        `https://${host}.finance.yahoo.com/v7/finance/quote` +
        `?symbols=${encodeURIComponent(syms)}&fields=${fields}&lang=en-US&region=US`;
      try {
        const r = await fetch(withCrumb(url), { headers: yfHeaders(), cache: 'no-store' });
        if (!r.ok) continue;
        const json = await r.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: any[] = json?.quoteResponse?.result ?? [];
        for (const q of results) {
          map.set(q.symbol as string, {
            price:      (q.regularMarketPrice           ?? 0) as number,
            changePct:  (q.regularMarketChangePercent   ?? 0) as number,
            volume:     (q.regularMarketVolume          ?? 0) as number,
            avgVolume:  (q.averageDailyVolume3Month     ?? 0) as number,
            marketCapM: ((q.marketCap ?? 0) as number) / 1_000_000,
          });
        }
        if (map.size > 0) break; // got results from this host
      } catch { /* try next host */ }
    }
    if (i + 100 < symbols.length) await new Promise(r => setTimeout(r, 80));
  }

  return map;
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export async function runEarningsScanner(
  startDate: string,   // YYYY-MM-DD — the "from" date (inclusive)
  days = 30,           // how many calendar days ahead to scan
): Promise<EarningsResult[]> {

  await ensureYFSession();

  // Build list of weekdays in [startDate, startDate + days)
  const dates: string[] = [];
  const base = new Date(startDate + 'T00:00:00Z');

  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    dates.push(d.toISOString().split('T')[0]);
  }

  // Fetch earnings concurrently (5 dates at a time to avoid hammering YF)
  const raw: Array<{
    symbol: string; name: string; earningsDate: string;
    timeOfDay: EarningsTimeOfDay; epsEstimate: number | null;
  }> = [];
  const seen = new Set<string>();
  const CONC = 5;

  for (let i = 0; i < dates.length; i += CONC) {
    const chunk = dates.slice(i, i + CONC);
    const groups = await Promise.all(chunk.map(d => fetchEarningsForDate(d)));
    for (const group of groups) {
      for (const row of group) {
        if (!seen.has(row.symbol)) {
          seen.add(row.symbol);
          raw.push(row);
        }
      }
    }
    if (i + CONC < dates.length) await new Promise(r => setTimeout(r, 150));
  }

  if (raw.length === 0) return [];

  // Batch-quote all found symbols for price / volume data
  const quoteMap = await batchQuoteAll(raw.map(r => r.symbol));

  // Build final results
  const results: EarningsResult[] = raw
    .map(r => {
      const q          = quoteMap.get(r.symbol);
      const earningsMs = new Date(r.earningsDate + 'T00:00:00Z').getTime();
      const startMs    = base.getTime();
      const daysUntil  = Math.round((earningsMs - startMs) / 86_400_000);

      return {
        symbol:            r.symbol,
        name:              r.name,
        earningsDate:      r.earningsDate,
        earningsDateLabel: toLabel(r.earningsDate),
        daysUntil,
        timeOfDay:         r.timeOfDay,
        epsEstimate:       r.epsEstimate,
        price:             q?.price      ?? 0,
        changePct:         q?.changePct  ?? 0,
        volume:            q?.volume     ?? 0,
        avgVolume:         q?.avgVolume  ?? 0,
        marketCapM:        q?.marketCapM ?? 0,
      };
    })
    .filter(r => r.price > 0) // hide delisted / invalid symbols
    .sort((a, b) => {
      // Sort by date first, then by market cap desc within each date
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
      return b.marketCapM - a.marketCapM;
    });

  return results;
}
