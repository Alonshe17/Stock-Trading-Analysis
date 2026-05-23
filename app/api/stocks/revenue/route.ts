import { NextRequest, NextResponse } from 'next/server';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function getFinnhubKey() {
  return process.env.FINNHUB_API_KEY ?? '';
}

export type RevenueQuarterPoint = {
  label:    string;   // fiscal quarter label e.g. "Q1 26"
  ts:       number;   // unix timestamp (period end date)
  revenueM: number;   // revenue in millions USD
};

export type EarningsBeat = {
  quarterLabel:   string;        // e.g. "Q1 27"
  epsSurprisePct: number;        // EPS surprise % (actual vs estimate)
  epsActual:      number;
  epsEstimate:    number;
  revenueM:       number;        // actual revenue for that quarter
  revenueYoyPct:  number | null; // YoY revenue growth %
};

export type UpcomingEarnings = {
  date:             string;   // e.g. "Aug 20, 2026"
  isEstimate:       boolean;
  epsEstimate:      number | null;
  revenueEstimateM: number | null;
};

export type EarningsTableRow = {
  quarterLabel:   string;
  reportDate:     string;        // e.g. "Apr 30, 2026"
  revenueM:       number;
  revenueYoyPct:  number | null;
  netIncomeM:     number | null;
  epsActual:      number;
  epsEstimate:    number;
  epsSurprisePct: number;        // already multiplied by 100
};

function toYahooSymbol(s: string) {
  if (s === 'BRK.B') return 'BRK-B';
  if (s === 'BF.B')  return 'BF-B';
  return s;
}

function periodToTs(period: string): number {
  return Math.floor(new Date(period + 'T00:00:00Z').getTime() / 1000);
}

/** Parse Yahoo fiscal label e.g. "1Q2026" → { fiscalQ:1, fiscalYr:2026 } */
function parseFiscalLabel(label: string): { fiscalQ: number; fiscalYr: number } | null {
  const m = label.match(/^(\d)Q(\d{4})$/);
  if (!m) return null;
  return { fiscalQ: parseInt(m[1]), fiscalYr: parseInt(m[2]) };
}

/** Format for display: { fiscalQ:1, fiscalYr:2026 } → "Q1 26" */
function fmtFiscalLabel(fiscalQ: number, fiscalYr: number): string {
  return `Q${fiscalQ} ${String(fiscalYr).slice(2)}`;
}

/**
 * Build a map: endMonth (1–12) → { fiscalQ, yearOffset }
 * yearOffset = fiscalYr - calendarYear of period end date
 * This captures the company-specific fiscal calendar from Yahoo's known recent quarters.
 */
function buildFiscalMap(
  quarters: { ts: number; fiscalQ: number; fiscalYr: number }[],
): Map<number, { fiscalQ: number; yearOffset: number }> {
  const map = new Map<number, { fiscalQ: number; yearOffset: number }>();
  for (const q of quarters) {
    const d     = new Date(q.ts * 1000);
    const month = d.getUTCMonth() + 1;          // 1–12
    const calYr = d.getUTCFullYear();
    map.set(month, { fiscalQ: q.fiscalQ, yearOffset: q.fiscalYr - calYr });
  }
  return map;
}

/** Derive fiscal label for any timestamp using the fiscal map. */
function deriveFiscalLabel(
  ts: number,
  fiscalMap: Map<number, { fiscalQ: number; yearOffset: number }>,
): string {
  const d     = new Date(ts * 1000);
  const month = d.getUTCMonth() + 1;
  const calYr = d.getUTCFullYear();
  const info  = fiscalMap.get(month);
  if (!info) {
    // Fallback: calendar quarter
    const calQ = Math.floor((month - 1) / 3) + 1;
    return `Q${calQ} ${String(calYr).slice(2)}`;
  }
  return fmtFiscalLabel(info.fiscalQ, calYr + info.yearOffset);
}

// ── Yahoo Finance crumb ───────────────────────────────────────────────────────
async function getYahooCrumb(): Promise<{ cookie: string; crumb: string } | null> {
  try {
    const r1 = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = r1.headers as any;
    const rawCookies: string[] =
      typeof h.getSetCookie === 'function'
        ? h.getSetCookie()
        : (r1.headers.get('set-cookie') ?? '').split(/,(?=[^ ])/);
    const cookieStr = rawCookies
      .map((c: string) => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');
    if (!cookieStr) return null;

    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookieStr },
    });
    if (!r2.ok) return null;
    const crumb = (await r2.text()).trim();
    if (!crumb || crumb.startsWith('{') || crumb.length < 4 || crumb.length > 40) return null;
    return { cookie: cookieStr, crumb };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const symbol   = req.nextUrl.searchParams.get('symbol')?.toUpperCase().trim();
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const key      = getFinnhubKey();
  const yfSymbol = toYahooSymbol(symbol);

  // ── 1. Yahoo Finance: exact recent 4 quarters with FISCAL quarter labels ───
  // Fetch modules in one call:
  //   earnings.financialsChart.quarterly  → fiscal labels ("1Q2026")
  //   incomeStatementHistoryQuarterly     → timestamps + exact revenue
  //   earningsHistory                     → EPS actual / estimate / surprise %
  const yahooQ: RevenueQuarterPoint[]                             = [];
  let   fiscalMap: Map<number, { fiscalQ: number; yearOffset: number }> = new Map();
  let   earningsBeat: EarningsBeat | null                         = null;
  let   earningsTable: EarningsTableRow[]                         = [];
  let   earningsTableTs: number[]                                 = [];   // parallel ts array for YoY patching
  let   upcomingEarnings: UpcomingEarnings | null                 = null;

  try {
    const session = await getYahooCrumb();
    if (session) {
      const { cookie, crumb } = session;
      const url =
        `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yfSymbol)}` +
        `?modules=earnings%2CincomeStatementHistoryQuarterly%2CearningsHistory%2CcalendarEvents&crumb=${encodeURIComponent(crumb)}`;
      const r = await fetch(url, {
        headers: { 'User-Agent': UA, Cookie: cookie, Accept: 'application/json' },
        next: { revalidate: 86400 },
      });
      if (r.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json: any = await r.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = json?.quoteSummary?.result?.[0] ?? {};

        // Fiscal labels from financialsChart
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chartQ: any[] =
          result?.earnings?.financialsChart?.quarterly ?? [];

        // Timestamps + revenue from incomeStatementHistory
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const incomeQ: any[] =
          result?.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? [];

        // Build a revenue→fiscalLabel lookup (values match exactly between both arrays)
        const revToLabel = new Map<number, string>();
        for (const c of chartQ) {
          if (c.date && c.revenue?.raw != null) {
            revToLabel.set(c.revenue.raw as number, c.date as string);
          }
        }

        // Match income statements to fiscal labels
        const matched: { ts: number; revenueM: number; fiscalQ: number; fiscalYr: number }[] = [];

        for (const inc of incomeQ) {
          if (inc.totalRevenue?.raw == null || inc.endDate?.raw == null) continue;
          const revRaw = inc.totalRevenue.raw as number;
          const ts     = inc.endDate.raw as number;
          const label  = revToLabel.get(revRaw);
          if (!label) continue;
          const parsed = parseFiscalLabel(label);
          if (!parsed) continue;
          matched.push({ ts, revenueM: revRaw / 1e6, ...parsed });
          yahooQ.push({
            label:    fmtFiscalLabel(parsed.fiscalQ, parsed.fiscalYr),
            ts,
            revenueM: revRaw / 1e6,
          });
        }

        // Build fiscal calendar map from Yahoo's known quarters
        if (matched.length > 0) {
          fiscalMap = buildFiscalMap(matched);
        }

        // ── Earnings beat from earningsHistory ──────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const epsHistory: any[] =
          result?.earningsHistory?.history ?? [];

        // Most recent completed quarter (highest ts with non-null actual)
        const latestEps = epsHistory
          .filter((h) => h.epsActual?.raw != null && h.quarter?.raw)
          .sort((a, b) => (b.quarter.raw as number) - (a.quarter.raw as number))[0];

        if (latestEps) {
          const epTs          = latestEps.quarter.raw as number;
          const quarterLabel  = fiscalMap.size > 0
            ? deriveFiscalLabel(epTs, fiscalMap)
            : (() => {
                const d  = new Date(epTs * 1000);
                const calQ = Math.floor(d.getUTCMonth() / 3) + 1;
                return `Q${calQ} ${String(d.getUTCFullYear()).slice(2)}`;
              })();
          const epsActual     = latestEps.epsActual.raw as number;
          const epsEstimate   = latestEps.epsEstimate?.raw as number ?? 0;
          const epsSurprisePct= (latestEps.surprisePercent?.raw as number ?? 0) * 100;

          // Match revenue for this quarter (±15 days)
          const revMatch = matched.find((q) => Math.abs(q.ts - epTs) < 15 * 86400);
          const revenueM = revMatch?.revenueM ?? 0;

          // YoY: find same quarter 4 entries back in matched (sorted newest→oldest)
          const sortedMatched = [...matched].sort((a, b) => b.ts - a.ts);
          const curIdx = sortedMatched.findIndex((q) => Math.abs(q.ts - epTs) < 15 * 86400);
          const prevYr = curIdx >= 0 && sortedMatched.length > curIdx + 4
            ? sortedMatched[curIdx + 4]
            : null;
          const revenueYoyPct = prevYr && prevYr.revenueM > 0
            ? ((revenueM - prevYr.revenueM) / prevYr.revenueM) * 100
            : null;

          earningsBeat = { quarterLabel, epsSurprisePct, epsActual, epsEstimate, revenueM, revenueYoyPct };
        }

        // ── Full earnings table (all 4 quarters) ────────────────────────────
        // Build revenue+netIncome lookup by matching financialsChart revenue
        // to incomeStatementHistory by revenue amount
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chartItems: any[] = result?.earnings?.financialsChart?.quarterly ?? [];
        const revToChartItem    = new Map<number, { netIncomeM: number }>();
        for (const c of chartItems) {
          if (c.revenue?.raw != null && c.earnings?.raw != null) {
            revToChartItem.set(c.revenue.raw as number, { netIncomeM: (c.earnings.raw as number) / 1e6 });
          }
        }

        // Sort earningsHistory oldest → newest for table display
        const sortedEpsHistory = [...epsHistory]
          .filter((h) => h.epsActual?.raw != null && h.quarter?.raw)
          .sort((a, b) => (a.quarter.raw as number) - (b.quarter.raw as number));

        const sortedMatchedAsc = [...matched].sort((a, b) => a.ts - b.ts);
        // Track ts for each earningsTable row so we can patch YoY later
        earningsTableTs = [];

        const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        // ── Upcoming earnings from calendarEvents ───────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cal: any = result?.calendarEvents?.earnings ?? {};
        const earningsDates: { raw: number }[] = cal.earningsDate ?? [];
        if (earningsDates.length > 0) {
          // Pick the first (earliest) date
          const nextTs  = earningsDates.sort((a, b) => a.raw - b.raw)[0].raw;
          const nd      = new Date(nextTs * 1000);
          const dateStr = `${mNames[nd.getUTCMonth()]} ${nd.getUTCDate()}, ${nd.getUTCFullYear()}`;
          upcomingEarnings = {
            date:             dateStr,
            isEstimate:       cal.isEarningsDateEstimate ?? false,
            epsEstimate:      cal.earningsAverage?.raw ?? null,
            revenueEstimateM: cal.revenueAverage?.raw != null
              ? (cal.revenueAverage.raw as number) / 1e6
              : null,
          };
        }
        const tableRows = sortedEpsHistory.map((h) => {
          const epTs        = h.quarter.raw as number;
          earningsTableTs.push(epTs);   // store ts for post-merge YoY patch

          const qLabel      = fiscalMap.size > 0
            ? deriveFiscalLabel(epTs, fiscalMap)
            : `Q${Math.floor(new Date(epTs * 1000).getUTCMonth() / 3) + 1} ${String(new Date(epTs * 1000).getUTCFullYear()).slice(2)}`;
          const epsAct      = h.epsActual.raw as number;
          const epsEst      = h.epsEstimate?.raw as number ?? 0;
          const epsSurprise = (h.surprisePercent?.raw as number ?? 0) * 100;

          // Find revenue match (±15 days)
          const revMatch    = sortedMatchedAsc.find((q) => Math.abs(q.ts - epTs) < 15 * 86400);
          const revenueM    = revMatch?.revenueM ?? 0;
          const chartItem   = revenueM > 0 ? revToChartItem.get(Math.round(revenueM * 1e6)) : undefined;
          const netIncomeM  = chartItem?.netIncomeM ?? null;

          const rDate      = new Date(epTs * 1000);
          const reportDate = `${mNames[rDate.getUTCMonth()]} ${rDate.getUTCDate()}, ${rDate.getUTCFullYear()}`;

          return {
            quarterLabel:   qLabel,
            reportDate,
            revenueM,
            revenueYoyPct:  null as number | null,   // patched after Finnhub merge
            netIncomeM,
            epsActual:      epsAct,
            epsEstimate:    epsEst,
            epsSurprisePct: epsSurprise,
          };
        });
        // Reverse both arrays together so they stay in sync (newest first)
        earningsTable   = tableRows.reverse();
        earningsTableTs = earningsTableTs.reverse();
      }
    }
  } catch { /* ignore */ }

  // ── 2. Finnhub: salesPerShare × shareOutstanding for older quarters ────────
  const finnhubQ: RevenueQuarterPoint[] = [];
  if (key) {
    try {
      const [mR, pR] = await Promise.all([
        fetch(
          `${FINNHUB_BASE}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${key}`,
          { next: { revalidate: 86400 } },
        ),
        fetch(
          `${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${key}`,
          { next: { revalidate: 86400 } },
        ),
      ]);

      if (mR.ok && pR.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metric: any  = await mR.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profile: any = await pR.json();

        const sharesM: number = profile?.shareOutstanding ?? 0;
        if (sharesM > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const spsArr: { period: string; v: number }[] =
            metric?.series?.quarterly?.salesPerShare ?? [];

          spsArr
            .filter((e) => e.period && e.v != null)
            .sort((a, b) => a.period.localeCompare(b.period))
            .forEach((e) => {
              const ts       = periodToTs(e.period);
              const revenueM = e.v * sharesM;
              // Use fiscal map if available, else fallback to period date label
              const label = fiscalMap.size > 0
                ? deriveFiscalLabel(ts, fiscalMap)
                : (() => {
                    const d  = new Date(ts * 1000);
                    const calQ = Math.floor(d.getUTCMonth() / 3) + 1;
                    return `Q${calQ} ${String(d.getUTCFullYear()).slice(2)}`;
                  })();
              finnhubQ.push({ label, ts, revenueM });
            });
        }
      }
    } catch { /* ignore */ }
  }

  // ── 3. Merge — Yahoo exact values override Finnhub approximate ────────────
  const merged = new Map<number, RevenueQuarterPoint>();

  for (const q of finnhubQ) merged.set(q.ts, q);

  for (const q of yahooQ) {
    const dup = [...merged.keys()].find((ts) => Math.abs(ts - q.ts) < 10 * 86400);
    if (dup !== undefined) merged.delete(dup);
    merged.set(q.ts, q);
  }

  const quarterly = [...merged.values()]
    .sort((a, b) => a.ts - b.ts)
    .slice(-8);

  // ── 4. Patch earningsTable Rev YoY using full merged history ──────────────
  // (Yahoo alone only has 4 quarters, so the prior-year quarter was missing)
  if (earningsTable.length > 0 && earningsTableTs.length === earningsTable.length) {
    const allMerged = [...merged.values()].sort((a, b) => a.ts - b.ts);
    earningsTable = earningsTable.map((row, i) => {
      if (row.revenueM <= 0) return row;
      const epTs   = earningsTableTs[i];
      const curIdx = allMerged.findIndex((q) => Math.abs(q.ts - epTs) < 15 * 86400);
      if (curIdx < 4) return row;
      const prevQ  = allMerged[curIdx - 4];
      if (!prevQ || prevQ.revenueM <= 0) return row;
      return {
        ...row,
        revenueYoyPct: ((row.revenueM - prevQ.revenueM) / prevQ.revenueM) * 100,
      };
    });
  }

  return NextResponse.json(
    { quarterly, earningsBeat, earningsTable, upcomingEarnings },
    { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } },
  );
}
