import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import type { AnalysisResult } from '@/lib/analysis';

type AlertPayload = {
  to: string;
  marketRegime: string;
  signals: AnalysisResult[];
  topScreener: Array<{ symbol: string; name: string; signal: string; rsi: number; distanceFromHigh: number }>;
  earningsWarnings: Array<{ symbol: string; date: string }>;
};

function buildEmail(payload: AlertPayload): string {
  const regimeColor = payload.marketRegime === 'BULLISH' ? '#16a34a' : payload.marketRegime === 'BEARISH' ? '#dc2626' : '#d97706';
  const signalRows = payload.signals
    .filter((s) => s.signal !== 'NEUTRAL' && s.signal !== 'WATCH')
    .map(
      (s) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #374151;font-weight:600">${s.symbol}</td>
        <td style="padding:8px;border-bottom:1px solid #374151">$${s.price.toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #374151">${s.signal}</td>
        <td style="padding:8px;border-bottom:1px solid #374151">${s.rsi.toFixed(1)}</td>
        <td style="padding:8px;border-bottom:1px solid #374151">${s.minerviniScore}/6</td>
      </tr>`,
    )
    .join('');

  const screenerRows = payload.topScreener
    .map(
      (s) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #374151;font-weight:600">${s.symbol}</td>
        <td style="padding:8px;border-bottom:1px solid #374151">${s.name}</td>
        <td style="padding:8px;border-bottom:1px solid #374151">${s.signal}</td>
        <td style="padding:8px;border-bottom:1px solid #374151">${s.rsi.toFixed(1)}</td>
        <td style="padding:8px;border-bottom:1px solid #374151">-${s.distanceFromHigh.toFixed(1)}%</td>
      </tr>`,
    )
    .join('');

  const earningsHtml =
    payload.earningsWarnings.length > 0
      ? `<p style="color:#f59e0b;margin:16px 0">⚠️ Upcoming Earnings: ${payload.earningsWarnings.map((e) => `${e.symbol} (${e.date})`).join(', ')}</p>`
      : '';

  return `
    <div style="background:#111827;color:#f9fafb;font-family:sans-serif;padding:32px;max-width:700px;margin:0 auto;border-radius:8px">
      <h1 style="margin:0 0 4px;font-size:22px">Stock Trading Analysis</h1>
      <p style="color:#9ca3af;margin:0 0 24px;font-size:13px">Daily Close Report · ${new Date().toDateString()}</p>

      <div style="background:#1f2937;border-radius:6px;padding:12px 16px;margin-bottom:24px">
        <span style="font-size:13px;color:#9ca3af">Market Regime: </span>
        <span style="font-weight:700;color:${regimeColor}">${payload.marketRegime}</span>
        <span style="font-size:12px;color:#6b7280;margin-left:8px">(SPY vs 200 EMA)</span>
      </div>

      ${earningsHtml}

      <h2 style="font-size:16px;margin:0 0 12px">Watchlist Signals</h2>
      ${signalRows ? `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="color:#9ca3af">
          <th style="text-align:left;padding:8px">Symbol</th>
          <th style="text-align:left;padding:8px">Price</th>
          <th style="text-align:left;padding:8px">Signal</th>
          <th style="text-align:left;padding:8px">RSI</th>
          <th style="text-align:left;padding:8px">Score</th>
        </tr></thead>
        <tbody>${signalRows}</tbody>
      </table>` : '<p style="color:#6b7280;font-size:13px">No active signals today.</p>'}

      <h2 style="font-size:16px;margin:24px 0 12px">Top Screener Candidates</h2>
      ${screenerRows ? `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="color:#9ca3af">
          <th style="text-align:left;padding:8px">Symbol</th>
          <th style="text-align:left;padding:8px">Name</th>
          <th style="text-align:left;padding:8px">Signal</th>
          <th style="text-align:left;padding:8px">RSI</th>
          <th style="text-align:left;padding:8px">Off High</th>
        </tr></thead>
        <tbody>${screenerRows}</tbody>
      </table>` : '<p style="color:#6b7280;font-size:13px">No screener candidates today.</p>'}

      <p style="color:#6b7280;font-size:11px;margin-top:32px;border-top:1px solid #374151;padding-top:16px">
        This is not financial advice. All analysis is for educational purposes only.
      </p>
    </div>`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });

  const resend = new Resend(apiKey);

  try {
    const payload: AlertPayload = await req.json();
    const html = buildEmail(payload);
    const { error } = await resend.emails.send({
      from: 'Stock Trading Analysis <onboarding@resend.dev>',
      to: payload.to,
      subject: `Swing Trade Report · ${new Date().toDateString()} · Market: ${payload.marketRegime}`,
      html,
    });
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
