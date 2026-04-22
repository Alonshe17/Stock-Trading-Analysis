import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="text-lg font-bold text-white">Stock Trading Analysis</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition">Dashboard</Link>
          <Link href="/trends" className="text-amber-400 hover:text-amber-300 transition">Trends</Link>
          <Link href="/recommendations" className="text-gray-400 hover:text-white transition">Picks</Link>
          <Link href="/screener" className="text-gray-400 hover:text-white transition">Screener</Link>
          <Link href="/alerts" className="text-gray-400 hover:text-white transition">Alerts</Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Price Action · Daily Close Analysis
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight mb-4">
            From Swing Trade To<br />
            <span className="text-blue-400">Stock Trading Analysis</span><br />
            <span className="text-gray-400 text-3xl font-semibold">Monitor</span>
          </h1>
          <p className="text-lg text-gray-400 mb-8 leading-relaxed">
            Professional-grade stock trading analysis across global markets.
            Daily close signals, Minervini trend scoring, dip opportunity detection,
            category trend analysis, and ATR-based risk management — all in one place.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition"
            >
              Open Dashboard
            </Link>
            <Link
              href="/trends"
              className="rounded-lg border border-amber-700 bg-amber-900/30 px-6 py-3 text-sm font-semibold text-amber-300 hover:border-amber-500 hover:text-white transition"
            >
              Trend Analysis
            </Link>
            <Link
              href="/screener"
              className="rounded-lg border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition"
            >
              Run Screener
            </Link>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-12 text-left">
            {[
              { label: '🎯 Dip Opportunities', desc: 'Stocks down on news but fundamentally strong' },
              { label: '🛡️ 14 Categories', desc: 'Defense, Semis, Healthcare, Crypto & more' },
              { label: '📊 Global Markets', desc: 'US, Asia, EUR/UK & Growth stocks daily' },
              { label: '⚡ Minervini Score', desc: '6-point trend template + price action signals' },
              { label: '📈 Large-Cap Screener', desc: 'S&P 500 filtered for swing setups' },
              { label: '💡 Analyst Targets', desc: 'Wall Street consensus price targets & upside' },
              { label: '🔔 Price Alerts', desc: 'Get notified when price hits your target' },
              { label: '📧 Email Reports', desc: 'Daily close report at market bell' },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="text-sm font-semibold text-white mb-1">{f.label}</div>
                <div className="text-xs text-gray-500">{f.desc}</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-600 mt-8">
            Requires a free Finnhub API key · Not financial advice
          </p>
        </div>
      </main>
    </div>
  );
}
