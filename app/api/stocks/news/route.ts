import { NextRequest, NextResponse } from 'next/server';
import { getCompanyNews } from '@/lib/finnhub';
import type { NewsItem } from '@/lib/finnhub';

// Strip exchange suffix (e.g. STAN.L → STAN, SAP.DE → SAP) for headline matching
function baseTicker(symbol: string): string {
  return symbol.replace(/\.(L|DE|PA|AS|SW|T|HK|KS|NS|SI|AX)$/i, '');
}

// Keep only articles that mention the ticker or company name
function isRelevant(item: NewsItem, symbol: string, companyName: string): boolean {
  const text = `${item.headline} ${item.summary}`.toLowerCase();
  const ticker = baseTicker(symbol).toLowerCase();
  if (new RegExp(`\\b${ticker}\\b`).test(text)) return true;

  const SKIP = new Set(['the', 'and', 'inc', 'corp', 'ltd', 'llc', 'plc', 'group', 'holdings', 'bank']);
  const significant = companyName
    .split(/[\s,.()/]+/)
    .find((w) => w.length >= 4 && !SKIP.has(w.toLowerCase()));
  if (significant && text.includes(significant.toLowerCase())) return true;

  return false;
}

const BULLISH = [
  'surge', 'surges', 'rally', 'rallies', 'beat', 'beats', 'record', 'upgrade', 'upgraded',
  'buy', 'outperform', 'bullish', 'profit', 'raised', 'raises', 'strong', 'gain', 'gains',
  'breakout', 'exceeds', 'boost', 'soar', 'soars', 'rises', 'positive',
];
const BEARISH = [
  'fall', 'falls', 'drop', 'drops', 'decline', 'declines', 'miss', 'misses', 'downgrade',
  'downgraded', 'sell', 'underperform', 'bearish', 'loss', 'cut', 'cuts', 'weak', 'slump',
  'slumps', 'breakdown', 'concern', 'concerns', 'warning', 'warns', 'lawsuit', 'layoff', 'layoffs',
];

function scoreSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const words = text.toLowerCase().split(/\W+/);
  let score = 0;
  for (const w of words) {
    if (BULLISH.includes(w)) score++;
    if (BEARISH.includes(w)) score--;
  }
  return score >= 1 ? 'bullish' : score <= -1 ? 'bearish' : 'neutral';
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? '';
  const name   = req.nextUrl.searchParams.get('name')   ?? '';
  if (!symbol) return NextResponse.json(null);

  try {
    const news = await getCompanyNews(symbol, 7);

    const filtered = news
      .filter((n) => n.headline)
      .filter((n) => !name || isRelevant(n, symbol, name))
      .sort((a, b) => b.datetime - a.datetime);

    if (filtered.length === 0) return NextResponse.json(null);

    const top = filtered[0];
    return NextResponse.json(
      {
        headline:  top.headline,
        source:    top.source,
        url:       top.url,
        datetime:  top.datetime,
        sentiment: scoreSentiment(top.headline),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
    );
  } catch {
    return NextResponse.json(null);
  }
}
