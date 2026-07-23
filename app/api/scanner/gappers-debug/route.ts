import { NextResponse } from 'next/server';
import { ensureYFSession, yfHeaders, withCrumb } from '@/lib/yfClient';

export const dynamic = 'force-dynamic';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function GET() {
  await ensureYFSession();

  const sym = 'AAPL';
  const results: Record<string, unknown> = {};

  // Test 1: YF quoteSummary v10 (the broken one)
  try {
    const url = withCrumb(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${sym}?modules=defaultKeyStatistics`);
    const r = await fetch(url, { headers: yfHeaders(), cache: 'no-store' });
    results.yf_v10 = { status: r.status, body: await r.json() };
  } catch (e) { results.yf_v10 = String(e); }

  // Test 2: Nasdaq free API — short interest
  try {
    const r = await fetch(
      `https://api.nasdaq.com/api/quote/${sym}/short-interest?type=SHORT+INTEREST&limit=1&offset=0&sortColumn=settlementDate&sortOrder=DESC&marketType=S`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' }, cache: 'no-store' }
    );
    results.nasdaq_si = { status: r.status, body: await r.json() };
  } catch (e) { results.nasdaq_si = String(e); }

  // Test 3: Nasdaq free API — company info (float shares)
  try {
    const r = await fetch(
      `https://api.nasdaq.com/api/quote/${sym}/info?assetclass=stocks`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' }, cache: 'no-store' }
    );
    results.nasdaq_info = { status: r.status, body: await r.json() };
  } catch (e) { results.nasdaq_info = String(e); }

  // Test 4: Nasdaq summary
  try {
    const r = await fetch(
      `https://api.nasdaq.com/api/quote/${sym}/summary?assetclass=stocks`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' }, cache: 'no-store' }
    );
    results.nasdaq_summary = { status: r.status, body: await r.json() };
  } catch (e) { results.nasdaq_summary = String(e); }

  return NextResponse.json(results);
}
