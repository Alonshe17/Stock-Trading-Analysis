/**
 * Earnings Calendar Scanner
 *
 * Yahoo Finance's v1/finance/earning endpoint is defunct (returns 500 Unknown Host).
 * The screener's earningsdate filter also doesn't work as a range filter.
 *
 * Solution: paginate through the top US equity stocks (sorted by market cap),
 * collect the earningsTimestamp returned for each stock, and filter to those
 * whose next earnings date falls in [startDate, startDate + days].
 *
 * We cover the top 5 000 stocks — this includes all S&P 500, Russell 1000,
 * Russell 2000 names plus thousands of smaller ones.  Any stock not in the
 * top 5 000 by market cap is unlikely to be on a retail trader's radar.
 *
 * Results are sorted by date (soonest first), then by market cap within
 * each date (largest company first so the most-watched names are at the top).
 */

import { ensureYFSession, yfHeaders, withCrumb } from './yfClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type EarningsTimeOfDay = 'BMO' | 'AMC' | 'TNS';
// BMO = Before Market Open · AMC = After Market Close · TNS = Time Not Specified

export type EarningsResult = {
  symbol:            string;
  name:              string;
  earningsDate:      string;       // YYYY-MM-DD
  earningsDateLabel: string;       // "Mon 6/3"
  daysUntil:         number;       // calendar days from startDate
  timeOfDay:         EarningsTimeOfDay;
  epsEstimate:       number | null;
  price:             number;
  changePct:         number;
  volume:            number;
  avgVolume:         number;
  marketCapM:        number;
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

/** Convert a unix timestamp to YYYY-MM-DD (UTC). */
function tsToDate(ts: number): string {
  const d = new Date(ts * 1000);
  const yr = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(d.getUTCDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

/**
 * Derive BMO / AMC / TNS from earningsTimestampStart / End.
 * Yahoo Finance typically encodes:
 *   BMO: 12:00–13:30 UTC (8–9:30 am ET summer)
 *   AMC: 20:00–21:30 UTC (4–5:30 pm ET summer)
 *   TNS: full-day window (tsStart == tsEnd or gap >= 20 h)
 */
function deriveTimeOfDay(
  tsStart: number | undefined,
  tsEnd:   number | undefined,
): EarningsTimeOfDay {
  if (!tsStart || !tsEnd) return 'TNS';
  // Full-day window = TNS
  if ((tsEnd - tsStart) >= 20 * 3600) return 'TNS';
  const hourUTC = new Date(tsStart * 1000).getUTCHours();
  if (hourUTC < 14) return 'BMO';   // before ~10am ET
  if (hourUTC >= 19) return 'AMC';  // from ~3pm ET
  return 'TNS';
}

// ── Screener pagination ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScreenerQuote = Record<string, any>;

/** Fetch one page of US equity stocks sorted by market cap (desc). */
async function fetchScreenerPage(offset: number, size: number): Promise<{
  quotes: ScreenerQuote[];
  total:  number;
}> {
  const body = JSON.stringify({
    offset,
    size,
    sortField: 'intradaymarketcap',
    sortType:  'DESC',
    quoteType: 'EQUITY',
    query: {
      operator: 'and',
      operands: [
        { operator: 'eq', operands: ['region', 'us'] },
      ],
    },
    userId:     '',
    userIdType: 'guid',
  });

  for (const host of ['query2', 'query1']) {
    const url = withCrumb(
      `https://${host}.finance.yahoo.com/v1/finance/screener?formatted=false&lang=en-US&region=US`
    );
    try {
      const r = await fetch(url, {
        method:  'POST',
        headers: { ...yfHeaders(), 'Content-Type': 'application/json' },
        body,
        cache:   'no-store',
      });
      if (!r.ok) continue;
      const json = await r.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = json?.finance?.result?.[0];
      if (!result) continue;
      return {
        quotes: (result.quotes ?? []) as ScreenerQuote[],
        total:  (result.total  ?? 0) as number,
      };
    } catch { /* try next host */ }
  }
  return { quotes: [], total: 0 };
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export async function runEarningsScanner(
  startDate: string,   // YYYY-MM-DD — the "from" date (inclusive)
  days = 30,           // how many calendar days ahead to scan
): Promise<EarningsResult[]> {

  await ensureYFSession();

  const base   = new Date(startDate + 'T00:00:00Z');
  const baseMs = base.getTime();
  // End: day after the last day (exclusive upper bound)
  const endMs  = baseMs + (days + 1) * 86_400_000;

  // ── Paginate through the screener until we have earningsTimestamp data ──────
  //
  // We cap at 5 000 stocks (20 pages × 250).  This covers every S&P 500,
  // Russell 1000, and Russell 2000 name, plus thousands of smaller ones.
  // Stocks outside this range are micro-caps rarely tracked by retail traders.
  //
  // We process 5 pages concurrently to stay within Yahoo Finance rate limits.

  const PAGE_SIZE = 250;
  const MAX_STOCKS = 5_000;
  const CONC = 5;

  const collected: ScreenerQuote[] = [];
  let total = Infinity;
  let offset = 0;

  while (offset < MAX_STOCKS && offset < total) {
    const chunk: number[] = [];
    for (let j = 0; j < CONC && offset + j * PAGE_SIZE < MAX_STOCKS && offset + j * PAGE_SIZE < total; j++) {
      chunk.push(offset + j * PAGE_SIZE);
    }
    if (chunk.length === 0) break;

    const pages = await Promise.all(chunk.map(o => fetchScreenerPage(o, PAGE_SIZE)));

    for (const page of pages) {
      if (page.total > 0) total = page.total;  // update total on first real response
      collected.push(...page.quotes);
    }

    // If all pages in this chunk returned nothing, stop
    if (pages.every(p => p.quotes.length === 0)) break;

    offset += chunk.length * PAGE_SIZE;
    if (offset < MAX_STOCKS && offset < total) {
      await new Promise(r => setTimeout(r, 150));
    }
  }

  if (collected.length === 0) return [];

  // ── Filter and transform ──────────────────────────────────────────────────

  const results: EarningsResult[] = [];
  const seen = new Set<string>();

  for (const q of collected) {
    const sym = (q.symbol as string | undefined) ?? '';
    if (!CLEAN_TICKER.test(sym)) continue;
    if (seen.has(sym)) continue;

    // earningsTimestamp is the next earnings date as unix seconds
    const earningsTsRaw: number | undefined =
      q.earningsTimestamp ?? q.earningsTimestampStart ?? undefined;
    if (!earningsTsRaw) continue;

    const earningsMs = earningsTsRaw * 1000;

    // Only keep stocks with earnings in [startDate, startDate + days]
    if (earningsMs < baseMs || earningsMs >= endMs) continue;

    const price = (q.regularMarketPrice ?? 0) as number;
    if (price <= 0) continue;

    seen.add(sym);

    const earningsDate = tsToDate(earningsTsRaw);
    const daysUntil    = Math.round((new Date(earningsDate + 'T00:00:00Z').getTime() - baseMs) / 86_400_000);

    const timeOfDay = deriveTimeOfDay(q.earningsTimestampStart, q.earningsTimestampEnd);

    // EPS estimate — epsCurrentYear is a quarterly proxy; epsForward is annual
    const epsEstimate: number | null =
      q.epsCurrentYear != null ? Number(q.epsCurrentYear) :
      q.epsForward     != null ? Number(q.epsForward)     : null;

    results.push({
      symbol:            sym,
      name:              (q.shortName ?? q.longName ?? sym) as string,
      earningsDate,
      earningsDateLabel: toLabel(earningsDate),
      daysUntil,
      timeOfDay,
      epsEstimate,
      price,
      changePct:  (q.regularMarketChangePercent   ?? 0) as number,
      volume:     (q.regularMarketVolume          ?? 0) as number,
      avgVolume:  (q.averageDailyVolume3Month     ?? 0) as number,
      marketCapM: ((q.marketCap ?? 0) as number) / 1_000_000,
    });
  }

  // Sort: soonest first, then largest market cap within each date
  results.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return b.marketCapM - a.marketCapM;
  });

  return results;
}
