/**
 * /api/cron/screener-refresh
 *
 * Vercel cron endpoint — runs the large-cap screener once per weekday at
 * 23:00 UTC (= 7:00 AM SGT T+1, ~2 hours after US market close) and stores
 * the result in Supabase screener_cache for fast reads throughout the day.
 *
 * Vercel cron config (vercel.json):
 *   { "path": "/api/cron/screener-refresh", "schedule": "0 23 * * 1-5" }
 *
 * Vercel automatically sends Authorization: Bearer $CRON_SECRET — set
 * CRON_SECRET in your Vercel project environment variables.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCandles } from '@/lib/finnhub';
import { calcMarketRegime } from '@/lib/analysis';
import { runScreener } from '@/lib/screener';
import { getSGTDate, setScreenerCache } from '@/lib/screenerCache';

// Allow up to 300 seconds for Pro tier; Hobby tier will cap at 60s.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Vercel cron sends: Authorization: Bearer $CRON_SECRET
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const sgtDate = getSGTDate();

  try {
    // 1. SPY candles → market regime
    const to = Math.floor(Date.now() / 1000);
    const from = to - 400 * 24 * 60 * 60;
    const spyCandles = await getCandles('SPY', 'D', from, to).catch(() => []);
    const marketRegime = calcMarketRegime(spyCandles);

    // 2. Full screener run (this takes 30–90 seconds depending on universe size)
    const results = await runScreener(marketRegime, 200);

    // 3. Store in Supabase
    const saved = await setScreenerCache(sgtDate, marketRegime, results);

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    return NextResponse.json({
      ok: true,
      sgtDate,
      marketRegime,
      resultCount: results.length,
      savedToCache: saved,
      elapsedSeconds: elapsed,
    });
  } catch (err) {
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    return NextResponse.json(
      { error: String(err), sgtDate, elapsedSeconds: elapsed },
      { status: 500 },
    );
  }
}
