import Link from 'next/link';

export const metadata = { title: 'Methodology & Data Sources — Stock Trading Analysis' };

function Section({ id, icon, title, children }: { id: string; icon: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-xl border border-gray-800 bg-gray-900 p-6 scroll-mt-24">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>{icon}</span>{title}
      </h2>
      <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Source({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-gray-600 border-l-2 border-gray-700 pl-3 mt-2">
      📚 Source: {children}
    </p>
  );
}

function Criterion({ pass, label, detail }: { pass: 'pass' | 'fail' | 'info'; label: string; detail: string }) {
  const dot = pass === 'pass' ? 'bg-emerald-500' : pass === 'fail' ? 'bg-red-500' : 'bg-blue-500';
  return (
    <div className="flex gap-3">
      <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dot}`} />
      <div>
        <span className="font-medium text-gray-200">{label}</span>
        <span className="text-gray-400"> — {detail}</span>
      </div>
    </div>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${color}`}>{children}</span>;
}

const TOC = [
  { id: 'overview',      label: 'Overview' },
  { id: 'data-sources',  label: 'Data Sources' },
  { id: 'ta-engine',     label: 'Technical Analysis Engine' },
  { id: 'signals',       label: 'Signal Logic' },
  { id: 'minervini',     label: 'Minervini Trend Template' },
  { id: 'fundamentals',  label: 'Fundamental Health Score' },
  { id: 'regime',        label: 'Market Regime Filter' },
  { id: 'screener',      label: 'Large-Cap Screener' },
  { id: 'disclaimer',    label: 'Disclaimer' },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-3">
            <Link href="/dashboard" className="hover:text-gray-300">Dashboard</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-300">Methodology</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Methodology &amp; Data Sources</h1>
          <p className="text-gray-400 max-w-2xl">
            Full transparency on how every signal, score, and indicator in this app is calculated,
            where the data comes from, and which professional frameworks we follow.
          </p>
        </div>

        <div className="flex gap-8">

          {/* Sticky Table of Contents — desktop only */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contents</p>
              <nav className="space-y-1">
                {TOC.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-sm text-gray-500 hover:text-gray-200 py-0.5 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 space-y-6">

            {/* ── Overview ── */}
            <Section id="overview" icon="📊" title="Overview">
              <p>
                Stock Trading Analysis is a swing-trade monitoring tool built for retail investors. It pulls
                live market data, applies a technical analysis engine, and scores stocks against a professional
                fundamental scorecard — all designed to surface high-probability swing-trade setups.
              </p>
              <p>
                Every number shown in the app is calculated from raw OHLCV (Open, High, Low, Close, Volume)
                candle data or from reported financial metrics. Nothing is estimated or interpolated beyond
                the standard formulas described on this page.
              </p>
              <p className="text-amber-400 text-xs font-medium border border-amber-800/50 bg-amber-900/20 rounded-lg px-3 py-2">
                ⚠ This tool is for educational and informational purposes only. It does not constitute
                financial advice. Always do your own research before making any investment decision.
              </p>
            </Section>

            {/* ── Data Sources ── */}
            <Section id="data-sources" icon="🔌" title="Data Sources">
              <div className="space-y-4">

                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-semibold">Finnhub</span>
                    <span className="text-xs text-gray-500 bg-gray-700 rounded px-1.5 py-0.5">Free tier</span>
                  </div>
                  <p className="text-gray-400 text-xs mb-2">Used for all fundamental data and analyst information.</p>
                  <ul className="space-y-1 text-xs text-gray-400">
                    <li>• <span className="text-gray-300">Company profiles</span> — name, sector, exchange, market cap (<code className="text-blue-400">/stock/profile2</code>)</li>
                    <li>• <span className="text-gray-300">Financial metrics</span> — 130+ ratios including ROE, margins, D/E, current ratio, cash flow (<code className="text-blue-400">/stock/metric?metric=all</code>)</li>
                    <li>• <span className="text-gray-300">Analyst recommendations</span> — Buy / Hold / Sell vote counts (<code className="text-blue-400">/stock/recommendation</code>)</li>
                    <li>• <span className="text-gray-300">Earnings calendar</span> — upcoming earnings dates (<code className="text-blue-400">/calendar/earnings</code>)</li>
                    <li>• <span className="text-gray-300">Company news</span> — last 7 days of headlines (<code className="text-blue-400">/company-news</code>)</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2">Cache: financial metrics refresh every 60 minutes. News refreshes every 30 minutes.</p>
                  <Source>finnhub.io — free tier API</Source>
                </div>

                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-semibold">Yahoo Finance</span>
                    <span className="text-xs text-gray-500 bg-gray-700 rounded px-1.5 py-0.5">Public chart API</span>
                  </div>
                  <p className="text-gray-400 text-xs mb-2">Used for all OHLCV price candle data.</p>
                  <ul className="space-y-1 text-xs text-gray-400">
                    <li>• <span className="text-gray-300">Daily candles</span> — 2 years of history for EMA 200 warm-up and all TA calculations (<code className="text-blue-400">/v8/finance/chart?interval=1d&range=2y</code>)</li>
                    <li>• <span className="text-gray-300">15-minute candles</span> — last 30 days for intraday entry timing (<code className="text-blue-400">interval=15m&range=1mo</code>)</li>
                    <li>• <span className="text-gray-300">Weekly candles</span> — 5 years of history for long-term trend context (<code className="text-blue-400">interval=1wk&range=5y</code>)</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2">No caching — candle data is fetched live on each page request.</p>
                  <Source>query1.finance.yahoo.com — public chart API v8</Source>
                </div>

              </div>
            </Section>

            {/* ── TA Engine ── */}
            <Section id="ta-engine" icon="⚙️" title="Technical Analysis Engine">
              <p>
                All indicators are computed server-side in pure TypeScript from raw OHLCV candles.
                No third-party TA library is used — every formula is implemented directly from its
                original academic or industry-standard definition.
              </p>

              <div className="space-y-4 mt-2">

                <div>
                  <h3 className="text-white font-medium mb-1">EMA — Exponential Moving Average</h3>
                  <p className="text-gray-400 text-xs">
                    Computed for periods 8, 50, 150, and 200 using the standard recursive formula:
                    <code className="ml-1 text-blue-300">EMA = Price × k + EMA_prev × (1 − k)</code> where <code className="text-blue-300">k = 2 / (period + 1)</code>.
                    Requires at least <code className="text-blue-300">period</code> candles to warm up before producing a valid value.
                  </p>
                  <Source>J. Appel, <em>Technical Analysis — Power Tools for Active Investors</em> (2005)</Source>
                </div>

                <div>
                  <h3 className="text-white font-medium mb-1">RSI — Relative Strength Index (14)</h3>
                  <p className="text-gray-400 text-xs">
                    Uses Wilder&apos;s smoothed average method over 14 periods.
                    <code className="ml-1 text-blue-300">RSI = 100 − (100 / (1 + RS))</code> where RS = avg gain / avg loss.
                    Readings below 35 are treated as oversold; above 70 as overbought.
                  </p>
                  <Source>J.W. Wilder Jr., <em>New Concepts in Technical Trading Systems</em> (1978)</Source>
                </div>

                <div>
                  <h3 className="text-white font-medium mb-1">ATR — Average True Range (14)</h3>
                  <p className="text-gray-400 text-xs">
                    True Range = max(High − Low, |High − Prev Close|, |Low − Prev Close|).
                    ATR is the 14-period smoothed average of True Range.
                    ATR% = ATR / Close × 100, used for normalised volatility comparison across stocks.
                  </p>
                  <Source>J.W. Wilder Jr., <em>New Concepts in Technical Trading Systems</em> (1978)</Source>
                </div>

                <div>
                  <h3 className="text-white font-medium mb-1">MACD — Moving Average Convergence Divergence (12, 26, 9)</h3>
                  <p className="text-gray-400 text-xs">
                    MACD Line = EMA(12) − EMA(26). Signal Line = EMA(9) of MACD Line.
                    Histogram = MACD Line − Signal Line. A positive histogram indicates bullish momentum.
                  </p>
                  <Source>G. Appel, <em>The Moving Average Convergence-Divergence Method</em> (1979)</Source>
                </div>

                <div>
                  <h3 className="text-white font-medium mb-1">Bollinger Bands (20, 2σ)</h3>
                  <p className="text-gray-400 text-xs">
                    Middle Band = 20-period SMA. Upper/Lower Bands = Middle ± (2 × rolling standard deviation over 20 periods).
                    Price near the upper band signals potential overbought conditions; near the lower band signals potential oversold conditions.
                  </p>
                  <Source>J. Bollinger, <em>Bollinger on Bollinger Bands</em> (2001)</Source>
                </div>

                <div>
                  <h3 className="text-white font-medium mb-1">Candlestick Pattern Detection</h3>
                  <p className="text-gray-400 text-xs">Detected on the most recent daily candle using these rules:</p>
                  <ul className="space-y-1 text-xs text-gray-400 mt-1">
                    <li>• <span className="text-gray-200 font-medium">Pin Bar</span> — Total wick length &gt; 2× body length, with a small body at the opposite end of the wick. Signals price rejection.</li>
                    <li>• <span className="text-gray-200 font-medium">Bullish / Bearish Engulfing</span> — Current candle body fully engulfs the prior candle body, opposite colour. Signals momentum shift.</li>
                    <li>• <span className="text-gray-200 font-medium">Inside Bar</span> — Current High &lt; Prior High AND Current Low &gt; Prior Low. Signals consolidation before a breakout.</li>
                    <li>• <span className="text-gray-200 font-medium">Breakout Candle</span> — Body &gt; 1.5× ATR, close in top 25% of candle range. Signals strong directional momentum.</li>
                  </ul>
                  <Source>S. Nison, <em>Japanese Candlestick Charting Techniques</em> (1991)</Source>
                </div>

              </div>
            </Section>

            {/* ── Signal Logic ── */}
            <Section id="signals" icon="🚦" title="Signal Logic">
              <p>
                Each stock is assigned one of five signals based on its technical conditions.
                The market regime (see below) acts as an overlay — Buy signals are suppressed
                when SPY is below its 200 EMA.
              </p>
              <div className="space-y-3 mt-2">
                <div className="rounded-lg border border-emerald-800/40 bg-emerald-900/10 p-3">
                  <div className="flex items-center gap-2 mb-1"><Tag color="bg-emerald-600 text-white">BREAKOUT</Tag></div>
                  <p className="text-xs text-gray-400">Price within 5% of 52-week high · Full Minervini alignment (score 5–6) · RSI 50–75 · Bullish breakout candle or inside bar · Market regime: BULLISH</p>
                  <Source>W. O&apos;Neil, <em>How to Make Money in Stocks</em> (CAN SLIM, 1988)</Source>
                </div>
                <div className="rounded-lg border border-blue-800/40 bg-blue-900/10 p-3">
                  <div className="flex items-center gap-2 mb-1"><Tag color="bg-blue-600 text-white">PULLBACK</Tag></div>
                  <p className="text-xs text-gray-400">Price in uptrend (50 &gt; 150 &gt; 200 EMA) · Pulled back to EMA 50 or Fibonacci 38–62% zone · RSI 35–55 · Bullish pin bar or engulfing · Market: BULLISH or CAUTION</p>
                  <Source>M. Minervini, <em>Trade Like a Stock Market Wizard</em> (2013)</Source>
                </div>
                <div className="rounded-lg border border-purple-800/40 bg-purple-900/10 p-3">
                  <div className="flex items-center gap-2 mb-1"><Tag color="bg-purple-600 text-white">MEAN REVERT</Tag></div>
                  <p className="text-xs text-gray-400">Price 15–35% below 52-week high · RSI &lt; 35 · Price at key support (prior swing low or EMA 200) · ATR% elevated · Market: any (caution flag in BEARISH)</p>
                  <Source>L. Connors &amp; C. Alvarez, <em>Short Term Trading Strategies That Work</em> (2009)</Source>
                </div>
                <div className="rounded-lg border border-amber-800/40 bg-amber-900/10 p-3">
                  <div className="flex items-center gap-2 mb-1"><Tag color="bg-amber-600 text-white">WATCH</Tag></div>
                  <p className="text-xs text-gray-400">Meets 3–4 of 6 criteria for any strategy. Not ready to enter — monitor for improving conditions.</p>
                </div>
                <div className="rounded-lg border border-red-800/40 bg-red-900/10 p-3">
                  <div className="flex items-center gap-2 mb-1"><Tag color="bg-red-700 text-white">AVOID</Tag></div>
                  <p className="text-xs text-gray-400">Price below EMA 200, or deteriorating EMA structure (50 &lt; 150 or 150 &lt; 200). Not suitable for swing trading.</p>
                </div>
              </div>
            </Section>

            {/* ── Minervini ── */}
            <Section id="minervini" icon="📋" title="Minervini Trend Template (Score 0–6)">
              <p>
                The Minervini Trend Template is a 6-condition checklist developed by Mark Minervini
                (US Investing Champion 1997, 2021) to identify stocks in a confirmed Stage 2 uptrend.
                One point is awarded per condition met.
              </p>
              <div className="space-y-2 mt-2">
                <Criterion pass="info" label="1. Price &gt; EMA 50" detail="Short-term momentum is positive" />
                <Criterion pass="info" label="2. Price &gt; EMA 150" detail="Medium-term trend is intact" />
                <Criterion pass="info" label="3. Price &gt; EMA 200" detail="Long-term trend is bullish" />
                <Criterion pass="info" label="4. EMA 50 &gt; EMA 150 &gt; EMA 200" detail="All moving averages are properly stacked — the strongest configuration" />
                <Criterion pass="info" label="5. EMA 200 trending up" detail="Compared to its value 20 trading days ago — confirms the long-term trend is rising, not flat" />
                <Criterion pass="info" label="6. Price within 25% of 52-week high" detail="Stock is near its highs, not in a deep correction" />
              </div>
              <div className="flex gap-3 mt-3 text-xs flex-wrap">
                <span className="text-emerald-400 font-semibold">5–6 Strong candidate</span>
                <span className="text-amber-400 font-semibold">3–4 Watch list</span>
                <span className="text-red-400 font-semibold">0–2 Avoid</span>
              </div>
              <Source>M. Minervini, <em>Trade Like a Stock Market Wizard</em> (2013) · <em>Think &amp; Trade Like a Champion</em> (2017)</Source>
            </Section>

            {/* ── Fundamental Health ── */}
            <Section id="fundamentals" icon="🏦" title="Fundamental Health Score (0–7)">
              <p>
                A 7-criteria composite scorecard based on thresholds used by Warren Buffett,
                Benjamin Graham, and institutional equity screens. Each criterion that passes
                awards 1 point. Requires at least 3 criteria to have data before a label is shown.
              </p>
              <p className="text-xs text-gray-500">All data sourced from Finnhub <code>/stock/metric?metric=all</code>. Values are TTM (Trailing Twelve Months) unless noted.</p>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-500">
                      <th className="text-left py-2 pr-4 font-medium">Criterion</th>
                      <th className="text-left py-2 pr-4 font-medium">Threshold</th>
                      <th className="text-left py-2 font-medium">Rationale &amp; Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    <tr>
                      <td className="py-2 pr-4 text-gray-200 font-medium">ROE</td>
                      <td className="py-2 pr-4 text-emerald-400">≥ 15%</td>
                      <td className="py-2 text-gray-400">Buffett&apos;s minimum capital efficiency threshold. S&amp;P 500 average is ~16%. <span className="text-gray-600">Source: Buffett shareholder letters; AAII Buffett screen</span></td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-gray-200 font-medium">Revenue Growth</td>
                      <td className="py-2 pr-4 text-emerald-400">≥ 10% YoY</td>
                      <td className="py-2 text-gray-400">Institutional growth screen minimum. CAN SLIM requires 25%+ but that applies to aggressive momentum; 10% is a balanced threshold. <span className="text-gray-600">Source: W. O&apos;Neil, CAN SLIM; MSCI growth index methodology</span></td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-gray-200 font-medium">Operating Margin</td>
                      <td className="py-2 pr-4 text-emerald-400">≥ 10%</td>
                      <td className="py-2 text-gray-400">Measures operational efficiency before interest/tax. 10% is approximately the S&amp;P 500 median. <span className="text-gray-600">Source: NYU Stern Damodaran margin database</span></td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-gray-200 font-medium">Net Margin</td>
                      <td className="py-2 pr-4 text-emerald-400">≥ 8%</td>
                      <td className="py-2 text-gray-400">S&amp;P 500 average net margin is ~8.5%. Buffett targets &gt;20% for his holdings but 8% is a realistic broad-market benchmark. <span className="text-gray-600">Source: Vena Solutions industry margin guide; Buffett criteria</span></td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-gray-200 font-medium">Debt / Equity</td>
                      <td className="py-2 pr-4 text-emerald-400">≤ 1.0x</td>
                      <td className="py-2 text-gray-400">Graham&apos;s conservative leverage standard. Above 1.0x the company is more debt-financed than equity-financed, raising bankruptcy risk in downturns. <span className="text-gray-600">Source: B. Graham, <em>The Intelligent Investor</em> (1949); Phoenix Strategy Group analysis</span></td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-gray-200 font-medium">Current Ratio</td>
                      <td className="py-2 pr-4 text-emerald-400">≥ 1.5</td>
                      <td className="py-2 text-gray-400">Graham&apos;s defensive investor standard for short-term liquidity. A ratio below 1.0 means current liabilities exceed current assets — a liquidity warning. <span className="text-gray-600">Source: B. Graham, <em>Security Analysis</em> (1934); CFA Institute</span></td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-gray-200 font-medium">Cash Flow / Share</td>
                      <td className="py-2 pr-4 text-emerald-400">&gt; 0</td>
                      <td className="py-2 text-gray-400">Positive operating cash flow per share confirms the business generates real cash, not just accounting profit. Cash flow is harder to manipulate than earnings. <span className="text-gray-600">Source: Buffett owner&apos;s manual; CFA Institute FCF valuation guide</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4 mt-3 text-xs flex-wrap">
                <span className="text-emerald-400 font-semibold">5–7 points → Strong</span>
                <span className="text-amber-400 font-semibold">3–4 points → Moderate</span>
                <span className="text-red-400 font-semibold">0–2 points → Weak</span>
              </div>

              <p className="text-xs text-amber-400/80 mt-2">
                ⚠ Sector context matters. Capital-intensive industries (utilities, telcos, REITs) naturally
                carry higher debt and lower margins. A utility with D/E of 1.5x may be perfectly healthy
                for its industry. Always compare to sector peers.
              </p>
              <Source>
                W. Buffett, Berkshire Hathaway shareholder letters (1977–present) ·
                B. Graham, <em>The Intelligent Investor</em> (1949) &amp; <em>Security Analysis</em> (1934) ·
                W. O&apos;Neil, <em>How to Make Money in Stocks</em> (CAN SLIM, 1988) ·
                NYU Stern Damodaran industry data (pages.stern.nyu.edu) ·
                Finnhub <code>/stock/metric</code> API
              </Source>
            </Section>

            {/* ── Market Regime ── */}
            <Section id="regime" icon="🌡️" title="Market Regime Filter">
              <p>
                The market regime indicator measures whether the overall US equity market is in a
                bullish or bearish environment. It uses <strong className="text-white">SPY</strong> (S&amp;P 500 ETF) as the benchmark.
              </p>
              <div className="space-y-2 mt-2 text-xs">
                <div className="flex gap-3 items-start">
                  <span className="text-emerald-400 font-bold shrink-0">BULLISH</span>
                  <span className="text-gray-400">SPY price is above its 200 EMA and within 10% of its 52-week high. All signal types are active.</span>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-amber-400 font-bold shrink-0">CAUTION</span>
                  <span className="text-gray-400">SPY is above its 200 EMA but more than 10% below its 52-week high. BREAKOUT signals are suppressed; PULLBACK signals carry a caution flag.</span>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-red-400 font-bold shrink-0">BEARISH</span>
                  <span className="text-gray-400">SPY price is below its 200 EMA. BREAKOUT and PULLBACK signals are suppressed. Only MEAN_REVERT signals are shown (with a caution flag).</span>
                </div>
              </div>
              <Source>
                The 200-day moving average as a market filter is widely used in systematic trend-following.
                P. Dunn &amp; J. Abraham, <em>Dual Momentum Investing</em> (G. Antonacci, 2014) ·
                R. Siegel, <em>Stocks for the Long Run</em> (2014)
              </Source>
            </Section>

            {/* ── Screener ── */}
            <Section id="screener" icon="🔍" title="Large-Cap Screener">
              <p>
                The screener runs against a universe of ~300 S&amp;P 500 constituents with market cap &gt;$10B.
                It applies the TA engine to each stock and surfaces the top candidates by signal strength.
              </p>
              <div className="space-y-1 text-xs text-gray-400 mt-2">
                <p><span className="text-gray-200 font-medium">Universe:</span> S&amp;P 500 large-cap stocks (&gt;$10B market cap), hardcoded list maintained in <code className="text-blue-400">lib/sp500.ts</code></p>
                <p><span className="text-gray-200 font-medium">Filters:</span> ATR% &gt; 1.5% (has swing potential) · Average volume &gt; 1M shares/day (liquid) · Not within 3 days of earnings</p>
                <p><span className="text-gray-200 font-medium">Ranking:</span> Signal priority (BREAKOUT &gt; PULLBACK &gt; MEAN_REVERT &gt; WATCH) then by Minervini score descending</p>
                <p><span className="text-gray-200 font-medium">Cache:</span> Results are cached in Supabase daily and refreshed automatically at 07:00 SGT (23:00 UTC) on weekdays — one hour after the US market close settles</p>
              </div>
              <Source>Stock universe: S&amp;P 500 index composition · Screener criteria adapted from W. O&apos;Neil CAN SLIM methodology and M. Minervini trend template</Source>
            </Section>

            {/* ── Disclaimer ── */}
            <Section id="disclaimer" icon="⚠️" title="Disclaimer">
              <p>
                Stock Trading Analysis is an independent educational tool. It is <strong className="text-white">not</strong> registered
                as a financial adviser, broker-dealer, or investment adviser in any jurisdiction.
              </p>
              <ul className="space-y-1.5 text-xs text-gray-400 list-disc list-inside">
                <li>All signals, scores, and analysis are generated algorithmically and have not been reviewed by a licensed financial professional.</li>
                <li>Past signal performance does not guarantee future results. Markets are inherently unpredictable.</li>
                <li>Fundamental data is sourced from Finnhub and may contain errors, delays, or missing values.</li>
                <li>Price data is sourced from Yahoo Finance and reflects end-of-day values unless otherwise indicated.</li>
                <li>Always consult a qualified financial adviser before making investment decisions.</li>
                <li>Never invest more than you can afford to lose.</li>
              </ul>
            </Section>

          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-8 pt-6 border-t border-gray-800 text-sm text-gray-600 flex flex-wrap gap-4">
          <Link href="/dashboard" className="hover:text-gray-300 transition-colors">Dashboard</Link>
          <Link href="/watchlist" className="hover:text-gray-300 transition-colors">Watchlist</Link>
          <Link href="/screener" className="hover:text-gray-300 transition-colors">Screener</Link>
          <Link href="/trends" className="hover:text-gray-300 transition-colors">Trends</Link>
        </div>

      </div>
    </div>
  );
}
