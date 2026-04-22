import { NextRequest, NextResponse } from 'next/server';
import { getCandles, getUpcomingEarnings } from '@/lib/finnhub';
import { analyze, calcMarketRegime } from '@/lib/analysis';
import { runScreener } from '@/lib/screener';
import { WATCHLIST } from '@/lib/watchlist';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Protect with shared secret
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const alertEmail = process.env.ALERT_EMAIL;
  if (!alertEmail) return NextResponse.json({ error: 'ALERT_EMAIL not set' }, { status: 500 });

  const to = Math.floor(Date.now() / 1000);
  const from = to - 400 * 24 * 60 * 60;

  // Market regime
  const spyCandles = await getCandles('SPY', 'D', from, to);
  const marketRegime = calcMarketRegime(spyCandles);

  // Watchlist analysis
  const signals = await Promise.all(
    WATCHLIST.map(async (w, i) => {
      await new Promise((r) => setTimeout(r, i * 100));
      const candles = await getCandles(w.symbol, 'D', from, to);
      return analyze(w.symbol, candles, marketRegime);
    }),
  );

  // Top screener picks
  const screenerResults = await runScreener(marketRegime, 5);
  const topScreener = screenerResults.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    signal: r.signal,
    rsi: r.rsi,
    distanceFromHigh: r.distanceFromHigh,
  }));

  // Earnings warnings (next 5 days)
  const today = new Date().toISOString().split('T')[0];
  const inFive = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
  const allEarnings = await getUpcomingEarnings(today, inFive);
  const watchSymbols = new Set(WATCHLIST.map((w) => w.symbol));
  const earningsWarnings = allEarnings.filter((e) => watchSymbols.has(e.symbol));

  // Send email
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/alerts/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: alertEmail, marketRegime, signals, topScreener, earningsWarnings }),
  });

  return NextResponse.json({ ok: true, marketRegime, signalCount: signals.length });
}
