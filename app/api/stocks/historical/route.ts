import { NextRequest, NextResponse } from 'next/server';

const YF_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

function toYahooSymbol(symbol: string): string {
  if (symbol === 'BRK.B') return 'BRK-B';
  if (symbol === 'BF.B')  return 'BF-B';
  return symbol;
}

export type HistoricalRowType = 'price' | 'dividend' | 'split';

export interface HistoricalRow {
  date:     number;             // Unix timestamp (seconds)
  type:     HistoricalRowType;
  // price
  open?:     number | null;
  high?:     number | null;
  low?:      number | null;
  close?:    number | null;
  adjClose?: number | null;
  volume?:   number | null;
  // dividend
  amount?: number;
  // split
  ratio?:  string;
}

const VALID_INTERVALS = ['1d', '1wk', '1mo'];
const VALID_RANGES    = ['1d', '5d', '3mo', '6mo', 'ytd', '1y', '5y', 'max'];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol   = searchParams.get('symbol')?.toUpperCase().trim();
  const interval = searchParams.get('interval') ?? '1d';
  const range    = searchParams.get('range');
  const from     = searchParams.get('from');   // unix seconds
  const to       = searchParams.get('to');     // unix seconds

  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const safeInterval = VALID_INTERVALS.includes(interval) ? interval : '1d';
  const yfSymbol     = toYahooSymbol(symbol);

  const params = new URLSearchParams({
    interval:             safeInterval,
    events:               'div,splits',
    includeAdjustedClose: 'true',
  });

  if (from && to) {
    params.set('period1', from);
    params.set('period2', to);
  } else if (range && VALID_RANGES.includes(range)) {
    params.set('range', range);
  } else {
    params.set('range', '1y');
  }

  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?${params}`;

  try {
    const res = await fetch(url, {
      headers: YF_HEADERS,
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    const result    = json?.chart?.result?.[0];
    if (!result)    throw new Error('No data from Yahoo Finance');

    const timestamps: number[]  = result.timestamp ?? [];
    const quote                  = result.indicators?.quote?.[0] ?? {};
    const adjCloseArr: number[]  = result.indicators?.adjclose?.[0]?.adjclose ?? [];

    // ── Price rows ─────────────────────────────────────────────────────────
    const priceRows: HistoricalRow[] = timestamps
      .map((t, i) => ({
        date:     t,
        type:     'price' as const,
        open:     quote.open?.[i]   ?? null,
        high:     quote.high?.[i]   ?? null,
        low:      quote.low?.[i]    ?? null,
        close:    quote.close?.[i]  ?? null,
        adjClose: adjCloseArr[i]    ?? null,
        volume:   quote.volume?.[i] ?? null,
      }))
      .filter((r) => r.close !== null && r.close !== undefined);

    // ── Dividend rows ───────────────────────────────────────────────────────
    const divEvents = result.events?.dividends ?? {};
    const dividendRows: HistoricalRow[] = Object.values(divEvents).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (d: any) => ({
        date:   d.date   as number,
        type:   'dividend' as const,
        amount: d.amount as number,
      }),
    );

    // ── Split rows ──────────────────────────────────────────────────────────
    const splitEvents = result.events?.splits ?? {};
    const splitRows: HistoricalRow[] = Object.values(splitEvents).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => ({
        date:  s.date      as number,
        type:  'split' as const,
        ratio: (s.splitRatio ?? `${s.numerator}:${s.denominator}`) as string,
      }),
    );

    // ── Merge & sort newest-first ───────────────────────────────────────────
    const rows: HistoricalRow[] = [...priceRows, ...dividendRows, ...splitRows].sort(
      (a, b) => b.date - a.date,
    );

    return NextResponse.json({ rows }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
