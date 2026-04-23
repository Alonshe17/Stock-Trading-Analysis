import { TradingNav } from '@/components/trading/TradingNav';
import { getCandles } from '@/lib/finnhub';
import { calcMarketRegime } from '@/lib/analysis';
import { runScreener } from '@/lib/screener';
import { getScreenerCache, getSGTDate, formatSGTTime } from '@/lib/screenerCache';
import { MarketRegime } from '@/components/trading/MarketRegime';
import { ScreenerTable } from '@/components/trading/ScreenerTable';
import { isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getData() {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { marketRegime: 'BULLISH' as const, results: [], source: 'none' as const, refreshedAt: null };

  const sgtDate = getSGTDate();

  // ── Try cache first ──────────────────────────────────────────────────────
  const cached = await getScreenerCache(sgtDate);
  if (cached && Array.isArray(cached.results) && cached.results.length > 0) {
    return {
      marketRegime: cached.market_regime as 'BULLISH' | 'CAUTION' | 'BEARISH',
      results: cached.results,
      source: 'cache' as const,
      refreshedAt: cached.refreshed_at,
    };
  }

  // ── Cache miss → live run ─────────────────────────────────────────────────
  const to = Math.floor(Date.now() / 1000);
  const from = to - 400 * 24 * 60 * 60;
  const spyCandles = await getCandles('SPY', 'D', from, to).catch(() => []);
  const marketRegime = calcMarketRegime(spyCandles);
  const results = await runScreener(marketRegime, 200).catch(() => []);

  return { marketRegime, results, source: 'live' as const, refreshedAt: null };
}

export default async function ScreenerPage() {
  let screenData: Awaited<ReturnType<typeof getData>>;
  try {
    screenData = await getData();
  } catch {
    screenData = { marketRegime: 'CAUTION', results: [], source: 'live', refreshedAt: null };
  }
  const { marketRegime, results, source, refreshedAt } = screenData;
  const hasKey = !!process.env.FINNHUB_API_KEY;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1700px] mx-auto px-4 py-8">
        <div className="mb-5 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-white">Large-Cap Screener</h1>
              <p className="text-gray-400 text-sm mt-1">
                S&P 500 large-caps screened for swing trade setups · Market cap &gt; $10B
              </p>
            </div>
            <TradingNav active="/screener" />
          </div>

          {/* Cache status badge */}
          <div className="shrink-0">
            {source === 'cache' && refreshedAt ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <div>
                  <span className="text-emerald-300 font-medium">Daily cache active</span>
                  <div className="text-emerald-600 mt-0.5">Updated {formatSGTTime(refreshedAt)}</div>
                </div>
              </div>
            ) : source === 'live' && hasKey ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                <div>
                  <span className="text-amber-300 font-medium">Live run</span>
                  <div className="text-amber-600 mt-0.5">
                    {isSupabaseConfigured
                      ? 'No cache for today yet — cron runs at 7AM SGT'
                      : 'Add Supabase to enable daily caching'}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
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
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">
                {results.length} candidates found · Click column headers to sort
              </span>
              {source === 'cache' && (
                <span className="text-xs text-gray-600">
                  Auto-refreshes daily at 7AM SGT
                </span>
              )}
            </div>
            <ScreenerTable entries={results} />
          </>
        )}
      </div>
    </div>
  );
}
