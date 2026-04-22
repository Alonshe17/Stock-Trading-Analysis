import type { AnalysisResult } from '@/lib/analysis';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export function TechnicalPanel({ a }: { a: AnalysisResult }) {
  const macdBull = a.macdHistogram > 0;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Technical Indicators</h3>

      <div className="space-y-4">

        {/* RSI */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400 flex items-center">
              RSI (14)
              <InfoTooltip title="RSI — Relative Strength Index (14)">
                <p>A momentum oscillator that measures the speed and size of recent price changes. Ranges from 0 to 100.</p>
                <ul className="mt-1.5 space-y-1">
                  <li><span className="text-emerald-400 font-semibold">Below 30</span> — Oversold. Price may be due for a bounce.</li>
                  <li><span className="text-amber-400 font-semibold">30–70</span> — Neutral zone. No extreme reading.</li>
                  <li><span className="text-red-400 font-semibold">Above 70</span> — Overbought. Momentum may be fading.</li>
                </ul>
                <p className="mt-1.5 text-gray-500">The &quot;14&quot; means it uses the last 14 candles (days) in its calculation.</p>
              </InfoTooltip>
            </span>
            <span className={a.rsi < 35 ? 'text-emerald-400 font-semibold' : a.rsi > 70 ? 'text-red-400 font-semibold' : 'text-gray-200'}>{a.rsi.toFixed(1)}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${a.rsi < 35 ? 'bg-emerald-500' : a.rsi > 70 ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(a.rsi, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-0.5"><span>Oversold 30</span><span>Overbought 70</span></div>
        </div>

        {/* EMA Alignment */}
        <div>
          <div className="text-sm text-gray-400 mb-2 flex items-center">
            EMA Alignment
            <InfoTooltip title="EMA Alignment — Exponential Moving Averages" width="w-80">
              <p>EMAs smooth out price data by weighting recent prices more heavily. The alignment of multiple EMAs shows the overall trend structure.</p>
              <ul className="mt-1.5 space-y-1">
                <li><span className="text-blue-300 font-semibold">EMA 50</span> — Short-term trend (≈ 10 trading weeks). First line of support in a healthy uptrend.</li>
                <li><span className="text-blue-300 font-semibold">EMA 150</span> — Medium-term trend. Crossing above signals a strengthening trend.</li>
                <li><span className="text-blue-300 font-semibold">EMA 200</span> — Long-term trend. Most watched by institutions. Price above EMA 200 = bull market for that stock.</li>
              </ul>
              <p className="mt-1.5"><span className="text-emerald-400 font-semibold">Ideal alignment:</span> Price &gt; EMA 50 &gt; EMA 150 &gt; EMA 200 (all stacked = strong uptrend).</p>
            </InfoTooltip>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <EmaRow label="EMA 50" value={a.ema50} price={a.price} />
            <EmaRow label="EMA 150" value={a.ema150} price={a.price} />
            <EmaRow label="EMA 200" value={a.ema200} price={a.price} />
          </div>
        </div>

        {/* MACD */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400 flex items-center">
            MACD
            <InfoTooltip title="MACD — Moving Average Convergence Divergence">
              <p>Shows the relationship between two EMAs (12-day and 26-day). A 9-day EMA of the MACD is the Signal line.</p>
              <ul className="mt-1.5 space-y-1">
                <li><span className="text-emerald-400 font-semibold">MACD &gt; Signal line</span> — Bullish momentum. Consider longs.</li>
                <li><span className="text-red-400 font-semibold">MACD &lt; Signal line</span> — Bearish momentum. Exercise caution.</li>
                <li><span className="text-amber-400 font-semibold">Histogram &gt; 0 and rising</span> — Momentum accelerating upward.</li>
              </ul>
              <p className="mt-1.5 text-gray-500">Format shown: MACD Line / Signal Line</p>
            </InfoTooltip>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-gray-200">{a.macdLine.toFixed(2)} / {a.signalLine.toFixed(2)}</span>
            <span className={`text-xs font-semibold ${macdBull ? 'text-emerald-400' : 'text-red-400'}`}>{macdBull ? 'Bullish' : 'Bearish'}</span>
          </div>
        </div>

        {/* Bollinger Bands */}
        <div>
          <div className="text-sm text-gray-400 mb-1 flex items-center">
            Bollinger Bands (20,2)
            <InfoTooltip title="Bollinger Bands (20, 2)" width="w-80">
              <p>A volatility channel built from a 20-day moving average (middle) with upper and lower bands set 2 standard deviations away.</p>
              <ul className="mt-1.5 space-y-1">
                <li><span className="text-red-400 font-semibold">Price near Upper Band</span> — Potentially overbought; momentum may be stretched.</li>
                <li><span className="text-emerald-400 font-semibold">Price near Lower Band</span> — Potentially oversold; watch for a bounce.</li>
                <li><span className="text-blue-400 font-semibold">Squeeze (bands very tight)</span> — Low volatility period. A big breakout move is often coming.</li>
                <li><span className="text-purple-400 font-semibold">Expansion (bands widening)</span> — A strong trend is underway.</li>
              </ul>
            </InfoTooltip>
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-gray-400">Upper: <span className="text-gray-200">${a.bbUpper.toFixed(2)}</span></span>
            <span className="text-gray-400">Mid: <span className="text-gray-200">${a.bbMiddle.toFixed(2)}</span></span>
            <span className="text-gray-400">Lower: <span className="text-gray-200">${a.bbLower.toFixed(2)}</span></span>
          </div>
        </div>

        {/* ATR */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400 flex items-center">
            ATR (14) — {a.atrPct.toFixed(1)}% of price
            <InfoTooltip title="ATR — Average True Range (14)">
              <p>Measures average daily price movement (volatility) over 14 days in dollar terms. It is NOT directional — it just measures how much the price moves.</p>
              <ul className="mt-1.5 space-y-1">
                <li><span className="text-white font-semibold">High ATR</span> — Wider swings. Stops need to be placed further away.</li>
                <li><span className="text-white font-semibold">Low ATR</span> — Tight range. Stock may need a catalyst to move.</li>
                <li><span className="text-emerald-400 font-semibold">ATR%</span> — ATR as a % of price. Useful for comparing stocks at different price levels. ATR% &gt; 1.5% is ideal for swing trading.</li>
              </ul>
              <p className="mt-1.5 text-gray-500">Used to calculate stop-loss distance and position size.</p>
            </InfoTooltip>
          </span>
          <span className="text-gray-200">${a.atr.toFixed(2)}</span>
        </div>

        {/* 52-week range */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">52-Week Range</span>
            <span className="text-gray-400 text-xs">-{a.distanceFromHigh.toFixed(1)}% from high</span>
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"
              style={{ width: `${((a.price - a.week52Low) / (a.week52High - a.week52Low)) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-0.5">
            <span>${a.week52Low.toFixed(2)}</span><span>${a.week52High.toFixed(2)}</span>
          </div>
        </div>

        {/* Minervini Score */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400 flex items-center">
              Minervini Trend Score
              <InfoTooltip title="Minervini Trend Template Score (0–6)" width="w-80" side="top">
                <p>Based on Mark Minervini&apos;s Trend Template — a checklist used to identify stocks in a Stage 2 (markup) uptrend. One point per condition met:</p>
                <ol className="mt-1.5 space-y-1 list-decimal list-inside">
                  <li>Price &gt; EMA 50</li>
                  <li>Price &gt; EMA 150</li>
                  <li>Price &gt; EMA 200</li>
                  <li>EMA 50 &gt; EMA 150 &gt; EMA 200 (perfect stack)</li>
                  <li>EMA 200 is trending upward vs. 20 days ago</li>
                  <li>Price is within 25% of its 52-week high</li>
                </ol>
                <ul className="mt-2 space-y-0.5">
                  <li><span className="text-emerald-400 font-semibold">5–6</span> — Strong candidate. All systems go.</li>
                  <li><span className="text-amber-400 font-semibold">3–4</span> — Watch list. Not quite ready.</li>
                  <li><span className="text-red-400 font-semibold">0–2</span> — Avoid. Trend structure is broken.</li>
                </ul>
              </InfoTooltip>
            </span>
            <span className={a.minerviniScore >= 5 ? 'text-emerald-400 font-semibold' : a.minerviniScore >= 3 ? 'text-amber-400' : 'text-red-400'}>{a.minerviniScore}/6</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-sm ${i < a.minerviniScore ? 'bg-emerald-500' : 'bg-gray-800'}`} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function EmaRow({ label, value, price }: { label: string; value: number; price: number }) {
  const above = price > value;
  return (
    <div className={`rounded border px-2 py-1.5 text-center ${above ? 'border-emerald-800 bg-emerald-900/30 text-emerald-400' : 'border-red-800 bg-red-900/30 text-red-400'}`}>
      <div className="text-gray-500 text-xs">{label}</div>
      <div className="font-semibold text-xs">${value.toFixed(2)}</div>
      <div className="text-xs">{above ? '▲ Above' : '▼ Below'}</div>
    </div>
  );
}
