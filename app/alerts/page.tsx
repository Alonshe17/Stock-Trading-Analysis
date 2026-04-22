'use client';

import { useState } from 'react';

export default function AlertsPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function triggerTestEmail() {
    if (!email) return;
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessage(d.error ?? 'Failed to send');
        setStatus('error');
      } else {
        setStatus('sent');
        setMessage(`✓ Email sent to ${d.sentTo} · Market: ${d.marketRegime}`);
      }
    } catch {
      setStatus('error');
      setMessage('Network error — check that NEXT_PUBLIC_APP_URL is set in Vercel.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">Email Alerts</h1>
        <p className="text-gray-400 text-sm mb-8">
          Receive a daily summary at market close (4:30pm ET) with all active signals, top screener picks, and earnings warnings.
        </p>

        {/* Setup checklist */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Setup Checklist</h2>
          <div className="space-y-3 text-sm">
            <Step
              num={1}
              label="Get Resend API key"
              desc="Sign up free at resend.com — 3,000 emails/month included"
              link="https://resend.com"
            />
            <Step
              num={2}
              label='Add to .env.local'
              desc='RESEND_API_KEY=re_xxxx and ALERT_EMAIL=your@email.com and CRON_SECRET=random_secret'
              code
            />
            <Step
              num={3}
              label="Update sender domain"
              desc='Edit /app/api/alerts/send/route.ts — change alerts@yourdomain.com to your Resend verified domain'
            />
            <Step
              num={4}
              label="Deploy to Vercel"
              desc='Add env vars in Vercel dashboard · Add NEXT_PUBLIC_APP_URL=https://your-app.vercel.app'
            />
            <Step
              num={5}
              label="Schedule daily cron (Vercel)"
              desc='Add to vercel.json: {"crons": [{"path": "/api/cron/daily-close", "schedule": "30 21 * * 1-5"}]}'
              code
            />
          </div>
        </div>

        {/* What you'll receive */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">What Each Email Contains</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-2"><span className="text-emerald-400">✓</span> Market regime status (SPY vs 200 EMA)</li>
            <li className="flex gap-2"><span className="text-emerald-400">✓</span> All active signals from your watchlist (BREAKOUT, PULLBACK, MEAN REVERT)</li>
            <li className="flex gap-2"><span className="text-emerald-400">✓</span> Top 3 large-cap screener candidates with entry/stop levels</li>
            <li className="flex gap-2"><span className="text-emerald-400">✓</span> Earnings warnings for next 5 days</li>
          </ul>
        </div>

        {/* Manual trigger */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Manual Test Trigger</h2>
          <p className="text-xs text-gray-500 mb-4">
            Manually trigger the daily close analysis and email send. Requires <code className="bg-gray-800 px-1 rounded">RESEND_API_KEY</code> and <code className="bg-gray-800 px-1 rounded">CRON_SECRET</code> to be set.
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={triggerTestEmail}
              disabled={status === 'sending' || !email}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {status === 'sending' ? 'Sending...' : 'Test Send'}
            </button>
          </div>
          {message && (
            <p className={`mt-3 text-sm ${status === 'sent' ? 'text-emerald-400' : 'text-red-400'}`}>{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ num, label, desc, code, link }: { num: number; label: string; desc: string; code?: boolean; link?: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">{num}</div>
      <div>
        <div className="font-medium text-gray-200">{label}</div>
        {code
          ? <code className="text-xs text-gray-400 bg-gray-800/80 px-2 py-1 rounded block mt-1">{desc}</code>
          : <div className="text-xs text-gray-400 mt-0.5">
              {desc}
              {link && <a href={link} target="_blank" rel="noreferrer" className="text-blue-400 ml-1 hover:underline">{link}</a>}
            </div>
        }
      </div>
    </div>
  );
}
