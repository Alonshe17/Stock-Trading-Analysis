import { getCandles } from '@/lib/finnhub';
import { calcMarketRegime } from '@/lib/analysis';
import { runScreener } from '@/lib/screener';
import { MarketRegime } from '@/components/trading/MarketRegime';
import { ScreenerTable } from '@/components/trading/ScreenerTable';

export const dynamic = 'force-dynamic';

async function getData() {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { marketRegime: 'BULLISH' as const, results: [] };

  const to = Math.floor(Date.now() / 1000);
  const from = to - 400 * 24 * 60 * 60;
  const spyCandles = await getCandles('SPY', 'D', from, to).catch(() => []);
  const marketRegime = calcMarketRegime(spyCandles);
  const results = await runScreener(marketRegime, 200).catch(() => []);
  return { marketRegime, results };
}

export default async function ScreenerPage() {
  let screenData: Awaited<ReturnType<typeof getData>>;
  try {
    screenData = await getData();
  } catch {
    screenData = { marketRegime: 'CAUTION', results: [] };
  }
  const { marketRegime, results } = screenData;
  const hasKey = !!process.env.FINNHUB_API_KEY;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1700px] mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Large-Cap Screener</h1>
          <p className="text-gray-400 text-sm mt-1">
            S&P 500 large-caps screened for swing trade setups · Market cap &gt; $10B · Updated at market close
          </p>
        </div>

        {!hasKey && (
          <div className="rounded-xl border border-amber-700/50 bg-amber-900/20 p-4 mb-6 text-sm text-amber-300">
            <strong>Setup required:</strong> Add <code className="bg-gray-800 px-1 rounded">FINNHUB_API_KEY</code> to .env.local to run the screener.
          </div>
        )}

        <div className="mb-6"><MarketRegime regime={marketRegime} /></div>

        {/* Screening criteria legend */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 mb-6 text-xs text-gray-400 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="font-semibold text-emerald-400 mb-1">BREAKOUT</div>
            Within 5% of 52-week high · Full Minervini alignment · RSI 50–75 · Bullish market
          </div>
          <div>
            <div className="font-semibold text-blue-400 mb-1">PULLBACK</div>
            Uptrend intact (50/150/200 EMA) · Pulled back to support · RSI 35–58 · Bullish pattern
          </div>
          <div>
            <div className="font-semibold text-purple-400 mb-1">MEAN REVERT</div>
            15–35% below 52-week high · RSI &lt; 35 · At key support · Elevated ATR
          </div>
        </div>

        {results.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
            {hasKey
              ? 'Screener running — this can take up to 60 seconds due to API rate limits on the free tier.'
              : 'Add your Finnhub API key to run the screener.'}
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-3">{results.length} candidates found · Click column headers to sort</div>
            <ScreenerTable entries={results} />
          </>
        )}
      </div>
    </div>
  );
}
