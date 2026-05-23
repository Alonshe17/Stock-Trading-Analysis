import { NextResponse } from 'next/server';
import { getCandles } from '@/lib/finnhub';
import type { Candle } from '@/lib/finnhub';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VixData = {
  current:   number;
  change:    number;
  changePct: number;
  level:     'low' | 'moderate' | 'elevated' | 'extreme';
  sparkline: { t: number; v: number }[];
};

export type PcrData = {
  symbol:    string;
  label:     string;
  pcr:       number;
  putOI:     number;
  callOI:    number;
  putVol:    number;
  callVol:   number;
  sentiment: 'bullish' | 'neutral' | 'bearish';
};

export type SessionDay = {
  date:      string;
  dateISO:   string;
  close:     number;
  changePct: number;
  volume:    number;
  volRatio:  number;
  type:      'distribution' | 'accumulation' | 'churning' | 'neutral';
};

export type DistAccData = {
  distributionDays: number;
  accumulationDays: number;
  marketCondition:  'confirmed-uptrend' | 'uptrend-under-pressure' | 'rally-attempt' | 'downtrend';
  spyVs50dma:       number;
  spyVs200dma:      number;
  sessions:         SessionDay[];
};

export type HistoricalPoint = {
  date:    string;       // "May 20"
  dateISO: string;       // "2025-05-20"
  vix:     number | null;
  qqqPcr:  number | null;
  spxPcr:  number | null;
};

export type SentimentPayload = {
  vix:     VixData | null;
  pcr:     PcrData[];
  distAcc: DistAccData;
  history: HistoricalPoint[];
  asOf:    string;
};

// ── Yahoo crumb auth ──────────────────────────────────────────────────────────

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

// ── VIX ───────────────────────────────────────────────────────────────────────

type VixResult = {
  data:   VixData | null;
  byDate: Map<string, number>;
};

async function fetchVix(cookie: string, crumb: string): Promise<VixResult> {
  try {
    const url =
      `https://query2.finance.yahoo.com/v8/finance/chart/%5EVIX` +
      `?interval=1d&range=1y&crumb=${encodeURIComponent(crumb)}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Cookie: cookie, Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return { data: null, byDate: new Map() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await r.json();
    const result = json?.chart?.result?.[0];
    if (!result) return { data: null, byDate: new Map() };

    const timestamps: number[]  = result.timestamp ?? [];
    const closes: (number|null)[] = result.indicators?.quote?.[0]?.close ?? [];

    const valid = timestamps
      .map((t, i) => ({ t, v: closes[i] }))
      .filter((p): p is { t: number; v: number } => p.v != null && !isNaN(p.v));

    if (valid.length < 2) return { data: null, byDate: new Map() };

    // Build byDate map from the 60-day sparkline data
    const byDate = new Map<string, number>();
    for (const pt of valid) {
      const iso = new Date(pt.t * 1000).toISOString().slice(0, 10);
      byDate.set(iso, pt.v);
    }

    const current = valid[valid.length - 1].v;
    const prev    = valid[valid.length - 2].v;
    const change    = current - prev;
    const changePct = (change / prev) * 100;

    const level: VixData['level'] =
      current >= 30 ? 'extreme' :
      current >= 20 ? 'elevated' :
      current >= 15 ? 'moderate' : 'low';

    const data: VixData = { current, change, changePct, level, sparkline: valid.slice(-30) };
    return { data, byDate };
  } catch {
    return { data: null, byDate: new Map() };
  }
}

// ── Put/Call Ratio ────────────────────────────────────────────────────────────

async function fetchPcr(
  symbol: string,
  label: string,
  cookie: string,
  crumb: string,
): Promise<PcrData | null> {
  try {
    const url =
      `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}` +
      `?crumb=${encodeURIComponent(crumb)}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Cookie: cookie, Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts = json?.optionChain?.result?.[0]?.options?.[0];
    if (!opts) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const puts:  any[] = opts.puts  ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls: any[] = opts.calls ?? [];

    const putOI   = puts .reduce((s: number, p: { openInterest?: number }) => s + (p.openInterest ?? 0), 0);
    const callOI  = calls.reduce((s: number, c: { openInterest?: number }) => s + (c.openInterest ?? 0), 0);
    const putVol  = puts .reduce((s: number, p: { volume?: number }) => s + (p.volume ?? 0), 0);
    const callVol = calls.reduce((s: number, c: { volume?: number }) => s + (c.volume ?? 0), 0);

    // Prefer OI for PCR; fall back to volume
    const pcr = callOI > 0 ? putOI / callOI : callVol > 0 ? putVol / callVol : 0;
    if (pcr === 0) return null;

    const sentiment: PcrData['sentiment'] =
      pcr < 0.7 ? 'bullish' : pcr > 1.0 ? 'bearish' : 'neutral';

    return { symbol, label, pcr, putOI, callOI, putVol, callVol, sentiment };
  } catch {
    return null;
  }
}

// ── PCR History via CBOE official CSVs ───────────────────────────────────────
// CBOE publishes free daily put/call ratio CSVs at cdn.cboe.com:
//   equitypc.csv  → CBOE Equity Put/Call Ratio  (retail / QQQ proxy)
//   indexpc.csv   → CBOE Index Put/Call Ratio   (institutional / SPX proxy)
// CSV layout (after 3-line header):  DATE,CALL,PUT,TOTAL,P/C Ratio
// Date format in CSV: MM/DD/YYYY  →  convert to YYYY-MM-DD for map keys.

type PcrHistoryEntry = { equity: number | null; index: number | null };

/** Convert "M/D/YYYY" or "MM/DD/YYYY" → "YYYY-MM-DD". Returns '' on failure. */
function cboeDate(raw: string): string {
  const parts = raw.trim().split('/');
  if (parts.length !== 3) return '';
  const [m, d, y] = parts;
  if (!m || !d || !y || y.length !== 4) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function fetchCboePcrHistory(): Promise<Map<string, PcrHistoryEntry>> {
  try {
    const hdrs = { 'User-Agent': UA, Accept: 'text/csv,text/plain,*/*' };

    const [eqR, idxR] = await Promise.all([
      fetch('https://cdn.cboe.com/resources/options/volume_and_call_put_ratios/equitypc.csv',
            { headers: hdrs, next: { revalidate: 86400 } }),
      fetch('https://cdn.cboe.com/resources/options/volume_and_call_put_ratios/indexpc.csv',
            { headers: hdrs, next: { revalidate: 86400 } }),
    ]);

    const map = new Map<string, PcrHistoryEntry>();

    function parseCboeCsv(text: string, field: 'equity' | 'index') {
      // First 3 lines are: disclaimer, product label, column headers
      // Data rows: DATE,CALL,PUT,TOTAL,P/C Ratio
      const lines = text.trim().split('\n');
      let dataStart = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().toUpperCase().startsWith('DATE')) { dataStart = i + 1; break; }
      }
      for (let i = dataStart; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 5) continue;
        const iso = cboeDate(cols[0]);
        const pcr = parseFloat(cols[4].trim());
        if (!iso || isNaN(pcr) || pcr <= 0) continue;
        const entry  = map.get(iso) ?? { equity: null, index: null };
        entry[field] = pcr;
        map.set(iso, entry);
      }
    }

    if (eqR.ok)  parseCboeCsv(await eqR.text(),  'equity');
    if (idxR.ok) parseCboeCsv(await idxR.text(), 'index');

    return map;
  } catch {
    return new Map();
  }
}

// ── Distribution / Accumulation ───────────────────────────────────────────────

function computeDistAcc(candles: Candle[]): DistAccData {
  const MIN = 30;
  if (candles.length < MIN) {
    return {
      distributionDays: 0, accumulationDays: 0,
      marketCondition: 'rally-attempt',
      spyVs50dma: 0, spyVs200dma: 0, sessions: [],
    };
  }

  const sessions: SessionDay[] = [];

  for (let i = 20; i < candles.length; i++) {
    const c    = candles[i];
    const prev = candles[i - 1];

    // 20-day avg volume
    const avgVol   = candles.slice(i - 20, i).reduce((s, x) => s + x.v, 0) / 20;
    const changePct = ((c.c - prev.c) / prev.c) * 100;
    const volRatio  = avgVol > 0 ? c.v / avgVol : 0;

    const dateObj = new Date(c.t * 1000);
    const date = dateObj.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
    const dateISO = dateObj.toISOString().slice(0, 10);

    let type: SessionDay['type'] = 'neutral';
    if      (changePct <= -0.2 && volRatio > 1.0) type = 'distribution';
    else if (changePct >=  0.2 && volRatio > 1.0) type = 'accumulation';
    else if (changePct >=  0.2 && volRatio <= 1.0) type = 'churning';

    sessions.push({ date, dateISO, close: c.c, changePct, volume: c.v, volRatio, type });
  }

  const last25          = sessions.slice(-25);
  const distributionDays = last25.filter(s => s.type === 'distribution').length;
  const accumulationDays = last25.filter(s => s.type === 'accumulation').length;

  // Moving averages
  const closes   = candles.map(c => c.c);
  const len      = closes.length;
  const ma50     = len >= 50  ? closes.slice(-50).reduce((a, b) => a + b, 0)  / 50  : null;
  const ma200    = len >= 200 ? closes.slice(-200).reduce((a, b) => a + b, 0) / 200 : null;
  const last     = closes[len - 1];
  const spyVs50dma  = ma50  ? ((last - ma50)  / ma50)  * 100 : 0;
  const spyVs200dma = ma200 ? ((last - ma200) / ma200) * 100 : 0;

  let marketCondition: DistAccData['marketCondition'];
  if (ma50 && last < ma50 && ma200 && last < ma200) {
    marketCondition = 'downtrend';
  } else if (distributionDays >= 5) {
    marketCondition = 'uptrend-under-pressure';
  } else if (ma50 && last < ma50) {
    marketCondition = 'rally-attempt';
  } else {
    marketCondition = 'confirmed-uptrend';
  }

  // Show all sessions from Jan 1 of the current year, newest first
  const janFirst = `${new Date().getFullYear()}-01-01`;
  const ytdSessions = sessions
    .filter(s => s.dateISO >= janFirst)
    .reverse();   // newest first

  return {
    distributionDays, accumulationDays, marketCondition,
    spyVs50dma, spyVs200dma,
    sessions: ytdSessions,
  };
}

// ── Build history array ───────────────────────────────────────────────────────

function buildHistory(
  candles: Candle[],
  vixByDate: Map<string, number>,
  pcrByDate: Map<string, PcrHistoryEntry>,
): HistoricalPoint[] {
  // Include all SPY candles from Jan 1 of the current year
  const janFirst = `${new Date().getFullYear()}-01-01`;
  const relevant = candles.filter((c) =>
    new Date(c.t * 1000).toISOString().slice(0, 10) >= janFirst,
  );
  const points: HistoricalPoint[] = relevant.map((c) => {
    const dateObj = new Date(c.t * 1000);
    const dateISO = dateObj.toISOString().slice(0, 10);
    const date    = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const pcr     = pcrByDate.get(dateISO) ?? null;
    return {
      date,
      dateISO,
      vix:    vixByDate.get(dateISO) ?? null,
      qqqPcr: pcr?.equity ?? null,
      spxPcr: pcr?.index  ?? null,
    };
  });
  return points.reverse(); // newest first
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET() {
  const [session, spyCandles] = await Promise.all([
    getYahooCrumb(),
    getCandles('SPY', 'D').catch(() => [] as Candle[]),
  ]);

  const emptyVix = { data: null, byDate: new Map<string, number>() };

  const [vixResult, qqqPcr, spxPcr, pcrByDate] = await Promise.all([
    session ? fetchVix(session.cookie, session.crumb)                                     : Promise.resolve(emptyVix),
    session ? fetchPcr('QQQ',  'QQQ PCR (Retail)',        session.cookie, session.crumb)  : Promise.resolve(null),
    session ? fetchPcr('^SPX', 'SPX PCR (Institutional)', session.cookie, session.crumb)  : Promise.resolve(null),
    fetchCboePcrHistory(),    // no auth needed — CBOE official free CSV
  ]);

  const vix    = vixResult.data;
  const distAcc = computeDistAcc(spyCandles);
  const pcr     = [qqqPcr, spxPcr].filter((p): p is PcrData => p !== null);
  const history = buildHistory(spyCandles, vixResult.byDate, pcrByDate);

  // Patch live PCR into the most-recent history entry (CBOE CSVs only cover pre-2020)
  // This ensures today's row in the D/A table always shows a live PCR value.
  if (history.length > 0 && (qqqPcr || spxPcr)) {
    history[0] = {
      ...history[0],
      qqqPcr: qqqPcr?.pcr ?? history[0].qqqPcr,
      spxPcr: spxPcr?.pcr ?? history[0].spxPcr,
    };
  }

  const payload: SentimentPayload = {
    vix,
    pcr,
    distAcc,
    history,
    asOf: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
  });
}
