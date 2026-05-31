import { NextResponse } from 'next/server';
import { ensureYFSession, yfHeaders, withCrumb, hasCrumb } from '@/lib/yfClient';

export const dynamic    = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  await ensureYFSession();

  const results: Record<string, unknown> = {
    hasCrumb: hasCrumb(),
  };

  // Test a tight date range: just 2026-05-28 to 2026-05-30
  const startUnix = Math.floor(new Date('2026-05-28T00:00:00Z').getTime() / 1000);
  const endUnix   = Math.floor(new Date('2026-05-30T00:00:00Z').getTime() / 1000);
  results['startUnix'] = startUnix;
  results['endUnix']   = endUnix;
  results['startDate'] = '2026-05-28';
  results['endDate']   = '2026-05-30';

  const body = JSON.stringify({
    offset: 0,
    size: 10,
    sortField: 'intradaymarketcap',
    sortType: 'DESC',
    quoteType: 'EQUITY',
    query: {
      operator: 'and',
      operands: [
        { operator: 'eq',   operands: ['region', 'us'] },
        { operator: 'btwn', operands: ['earningsdate', startUnix, endUnix] },
      ],
    },
    userId: '',
    userIdType: 'guid',
  });

  try {
    const url = withCrumb(
      `https://query2.finance.yahoo.com/v1/finance/screener?formatted=false&lang=en-US&region=US`
    );
    const r = await fetch(url, {
      method: 'POST',
      headers: { ...yfHeaders(), 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
    });
    const j = await r.json();
    const quotes = j?.finance?.result?.[0]?.quotes ?? [];
    const total  = j?.finance?.result?.[0]?.total  ?? 0;

    results['total'] = total;
    results['returned'] = quotes.length;

    // Show earnings timestamps for each quote
    results['quotes'] = quotes.map((q: Record<string, unknown>) => ({
      symbol:              q.symbol,
      earningsTimestamp:   q.earningsTimestamp,
      earningsDate_human:  q.earningsTimestamp
        ? new Date((q.earningsTimestamp as number) * 1000).toISOString()
        : null,
      earningsTimestampStart: q.earningsTimestampStart,
      earningsTimestampEnd:   q.earningsTimestampEnd,
      price: q.regularMarketPrice,
      marketCap: q.marketCap,
    }));
  } catch (e) {
    results['error'] = String(e);
  }

  return NextResponse.json(results, { status: 200 });
}
