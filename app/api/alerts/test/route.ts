/**
 * /api/alerts/test
 * Quick test endpoint — runs watchlist analysis and sends a sample email.
 * No CRON_SECRET required (this is a user-triggered test, not a scheduled job).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCandles } from '@/lib/finnhub';
import { analyze, calcMarketRegime } from '@/lib/analysis';
import { WATCHLIST } from '@/lib/watchlist';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set in environment variables' }, { status: 500 });
  }

  let to: string;
  try {
    const body = await req.json();
    to = body.email?.trim();
    if (!to) throw new Error('missing email');
  } catch {
    return NextResponse.json({ error: 'Provide { email: "..." } in the request body' }, { status: 400 });
  }

  try {
    // Quick analysis — just SPY + watchlist (no full screener, keeps it under 30s)
    const to_ts = Math.floor(Date.now() / 1000);
    const from_ts = to_ts - 400 * 24 * 60 * 60;

    const spyCandles = await getCandles('SPY', 'D', from_ts, to_ts).catch(() => []);
    const marketRegime = calcMarketRegime(spyCandles);

    const signals = await Promise.all(
      WATCHLIST.slice(0, 8).map(async (w, i) => {
        await new Promise((r) => setTimeout(r, i * 150));
        const candles = await getCandles(w.symbol, 'D', from_ts, to_ts).catch(() => []);
        return analyze(w.symbol, candles, marketRegime);
      }),
    );

    // Send via the existing email builder
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/alerts/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        marketRegime,
        signals,
        topScreener: [],
        earningsWarnings: [],
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      return NextResponse.json({ error: d.error ?? 'Email send failed' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, sentTo: to, marketRegime });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
