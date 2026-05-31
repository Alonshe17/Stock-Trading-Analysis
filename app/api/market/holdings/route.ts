import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export type Holding = {
  rank:         number;
  name:         string;
  cusip:        string;
  valueK:       number; // value in $thousands
  shares:       number;
  pctPortfolio: number;
};

export type HoldingsData = {
  investor:    string;
  cik:         string;
  filedAt:     string;
  period:      string;
  totalValueM: number; // portfolio total in $millions
  holdings:    Holding[];
};

const UA = 'StockTradingApp/1.0 contact@stockapp.io';

function padCik(cik: string): string {
  return String(parseInt(cik.replace(/\D/g, ''), 10)).padStart(10, '0');
}

// ── Step 1: Find the latest 13F-HR accession from EDGAR submissions ───────────
async function fetchLatest13F(
  cik: string,
): Promise<{ accession: string; filedAt: string; period: string } | null> {
  const padded = padCik(cik);
  const res    = await fetch(`https://data.sec.gov/submissions/CIK${padded}.json`, {
    headers: { 'User-Agent': UA },
    cache:   'no-store',
  });
  if (!res.ok) return null;

  const data = await res.json() as {
    filings?: {
      recent?: {
        form:            string[];
        filingDate:      string[];
        accessionNumber: string[];
        reportDate:      string[];
      };
    };
  };

  const r = data.filings?.recent;
  if (!r) return null;

  for (let i = 0; i < r.form.length; i++) {
    if (r.form[i] === '13F-HR') {
      return {
        accession: r.accessionNumber[i],
        filedAt:   r.filingDate[i],
        period:    r.reportDate[i],
      };
    }
  }
  return null;
}

// ── Step 2: Fetch and parse the holdings XML ──────────────────────────────────
async function fetchHoldings(cik: string, accession: string): Promise<Holding[]> {
  const rawCik  = String(parseInt(cik.replace(/\D/g, ''), 10));
  const accFlat = accession.replace(/-/g, ''); // e.g. 000106798325000005
  const headers = { 'User-Agent': UA };

  // Try filing index JSON to find the infotable XML file name
  const idxUrl = `https://www.sec.gov/Archives/edgar/data/${rawCik}/${accFlat}/${accession}-index.json`;
  const idxRes = await fetch(idxUrl, { headers, cache: 'no-store' });

  let xmlFileName = '';

  if (idxRes.ok) {
    const idx = await idxRes.json() as {
      directory?: { item?: Array<{ name: string; type: string }> };
    };
    const items = idx.directory?.item ?? [];

    for (const item of items) {
      const t = (item.type ?? '').toUpperCase();
      const n = (item.name ?? '').toLowerCase();
      if (t === 'INFORMATION TABLE' || n.includes('infotable')) {
        xmlFileName = item.name;
        break;
      }
    }
    if (!xmlFileName) {
      for (const item of items) {
        if ((item.name ?? '').endsWith('.xml') && !(item.name ?? '').toLowerCase().includes('primary')) {
          xmlFileName = item.name;
          break;
        }
      }
    }
  }

  // Try the specific XML file
  if (xmlFileName) {
    const xmlUrl = `https://www.sec.gov/Archives/edgar/data/${rawCik}/${accFlat}/${xmlFileName}`;
    const xmlRes = await fetch(xmlUrl, { headers, cache: 'no-store' });
    if (xmlRes.ok) {
      const holdings = extractHoldings(await xmlRes.text());
      if (holdings.length > 0) return holdings;
    }
  }

  // Fallback: full submission text file (contains embedded XML)
  const txtUrl = `https://www.sec.gov/Archives/edgar/data/${rawCik}/${accFlat}/${accession}.txt`;
  const txtRes = await fetch(txtUrl, { headers, cache: 'no-store' });
  if (txtRes.ok) {
    const txt   = await txtRes.text();
    const start = txt.indexOf('<informationTable');
    const end   = txt.lastIndexOf('</informationTable>');
    if (start !== -1 && end !== -1) {
      return extractHoldings(txt.slice(start, end + 19));
    }
  }

  return [];
}

// ── XML parsing ───────────────────────────────────────────────────────────────
function extractHoldings(xml: string): Holding[] {
  const raw: Array<{ name: string; cusip: string; valueK: number; shares: number }> = [];
  const re  = /<infoTable[^>]*>([\s\S]*?)<\/infoTable>/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(xml)) !== null) {
    const blk    = m[1];
    const name   = xmlTag(blk, 'nameOfIssuer') ?? '';
    const cusip  = xmlTag(blk, 'cusip')        ?? '';
    const valueK = parseInt((xmlTag(blk, 'value')      ?? '0').replace(/,/g, ''), 10) || 0;
    const shares = parseInt((xmlTag(blk, 'sshPrnamt')  ?? '0').replace(/,/g, ''), 10) || 0;
    if (name && valueK > 0) raw.push({ name, cusip, valueK, shares });
  }

  raw.sort((a, b) => b.valueK - a.valueK);
  const top = raw.slice(0, 25);
  const total = top.reduce((s, h) => s + h.valueK, 0);

  return top.map((h, i) => ({
    ...h,
    rank:         i + 1,
    pctPortfolio: total > 0 ? (h.valueK / total) * 100 : 0,
  }));
}

function xmlTag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}[^>]*>\\s*([^<]*)\\s*</${name}>`, 'i'));
  return m ? m[1].trim() : null;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const cik      = req.nextUrl.searchParams.get('cik')      ?? '';
  const investor = req.nextUrl.searchParams.get('investor') ?? '';

  if (!cik) return NextResponse.json({ error: 'Missing cik parameter' }, { status: 400 });

  try {
    const filing = await fetchLatest13F(cik);
    if (!filing) {
      return NextResponse.json(
        { error: 'No 13F-HR filing found. This fund may have converted to a family office and no longer reports to the SEC.' },
        { status: 404 },
      );
    }

    const holdings    = await fetchHoldings(cik, filing.accession);
    const totalValueM = Math.round(holdings.reduce((s, h) => s + h.valueK, 0) / 1_000);

    const result: HoldingsData = {
      investor,
      cik,
      filedAt:    filing.filedAt,
      period:     filing.period,
      totalValueM,
      holdings,
    };

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
