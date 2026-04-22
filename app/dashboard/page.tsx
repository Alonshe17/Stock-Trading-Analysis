import { getCandles, getUpcomingEarnings, getMarketNews } from '@/lib/finnhub';
import { analyze, calcMarketRegime } from '@/lib/analysis';
import { WATCHLIST } from '@/lib/watchlist';
import { MarketRegime } from '@/components/trading/MarketRegime';
import { StockCard } from '@/components/trading/StockCard';
import { SignalBadge } from '@/components/trading/SignalBadge';
import { NewsPanel } from '@/components/trading/NewsPanel';
import Link from 'next/link';
import type { Signal } from '@/lib/analysis';

export const dynamic = 'force-dynamic';

async function getData() {
  // Fetch SPY + all watchlist stocks in parallel (staggered to avoid Yahoo rate limits)
  const [spyCandles, ...allCandles] = await Promise.all([
    getCandles('SPY', 'D').catch(() => []),
    ...WATCHLIST.map(async (w, i) => {
      await new Promise((r) => setTimeout(r, i * 200));
      return getCandles(w.symbol, 'D').catch(() => []);
    }),
  ]);

  const marketRegime = calcMarketRegime(spyCandles);
  const analyses = WATCHLIST.map((w, i) => analyze(w.symbol, allCandles[i], marketRegime));

  const today = new Date().toISOString().split('T')[0];
  const inFive = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
  const [earnings, marketNews] = await Promise.all([
    getUpcomingEarnings(today, inFive).catch(() => []),
    getMarketNews('general').catch(() => []),
  ]);
  const earningsMap: Record<string, string> = {};
  earnings.forEach((e) => { earningsMap[e.symbol] = e.date; });

  return { marketRegime, analyses, earningsMap, marketNews };
}

export default async function DashboardPage() {
  let dashData: Awaited<ReturnType<typeof getData>>;
  try {
    dashData = await getData();
  } catch {
    dashData = { marketRegime: 'CAUTION', analyses: [], earningsMap: {}, marketNews: [] };
  }
  const { marketRegime, analyses, earningsMap, marketNews } = dashData;
  const hasKey = !!process.env.FINNHUB_API_KEY;

  const signalCounts = analyses.reduce<Record<string, number>>((acc, a) => {
    acc[a.signal] = (acc[a.signal] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Stock Trading Analysis</h1>
          <p className="text-gray-400 text-sm mt-1">Daily close analysis · Large-cap price action strategy</p>
        </div>

        {!hasKey && (
          <div className="rounded-xl border border-amber-700/50 bg-amber-900/20 p-4 mb-6 text-sm text-amber-300">
            <strong>Setup required:</strong> Add your <code className="bg-gray-800 px-1 rounded">FINNHUB_API_KEY</code> to <code className="bg-gray-800 px-1 rounded">.env.local</code> to load live data.
            Get a free key at <a href="https://finnhub.io" className="underline" target="_blank" rel="noreferrer">finnhub.io</a>.
          </div>
        )}

        <div className="mb-6"><MarketRegime regime={marketRegime} /></div>

        {analyses.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {(['BREAKOUT', 'PULLBACK', 'MEAN_REVERT', 'WATCH', 'AVOID'] as Signal[]).map((s) => (
              <div key={s} className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-center">
                <div className="text-2xl font-bold text-white mb-1">{signalCounts[s] ?? 0}</div>
                <SignalBadge signal={s} size="sm" />
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mb-8 flex-wrap">
          <Link href="/watchlist" className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:border-gray-500 transition">
            Full Watchlist →
          </Link>
          <Link href="/screener" className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:border-gray-500 transition">
            Large-Cap Screener →
          </Link>
          <Link href="/scanner" className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:border-gray-500 transition">
            Stock Pick Scanner →
          </Link>
          <Link href="/recommendations" className="rounded-lg border border-blue-800 bg-blue-900/30 px-4 py-2 text-sm text-blue-300 hover:border-blue-600 transition">
            Daily Picks →
          </Link>
          <Link href="/trends" className="rounded-lg border border-amber-700 bg-amber-900/30 px-4 py-2 text-sm text-amber-300 hover:border-amber-500 transition">
            Trend Analysis →
          </Link>
          <Link href="/alerts" className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:border-gray-500 transition">
            Email Alerts →
          </Link>
        </div>

        <h2 className="text-base font-semibold text-gray-300 mb-3">Watchlist Overview</h2>
        {analyses.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
            Add your Finnhub API key to see analysis.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {WATCHLIST.map((w, i) => {
              const a = analyses[i];
              if (!a) return null;
              return (
                <StockCard
                  key={w.symbol}
                  analysis={a}
                  name={w.name}
                  isEtf={w.type === 'etf'}
                  isSmallCap={w.warning === 'small-cap'}
                  earningsDate={earningsMap[w.symbol] ?? null}
                />
              );
            })}
          </div>
        )}

        {/* Market News */}
        {marketNews.length > 0 && (
          <div className="mt-8">
            <NewsPanel news={marketNews} title="Market News" />
          </div>
        )}
      </div>
    </div>
  );
}
