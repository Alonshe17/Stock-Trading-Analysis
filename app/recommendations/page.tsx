import Link from 'next/link';
import { fetchYahooCandles } from '@/lib/yahoofetch';
import { calcMarketRegime } from '@/lib/analysis';
import { fetchRecommendations } from '@/lib/recommendations';
import {
  US_REC_STOCKS,
  ASIA_STOCKS,
  EUR_UK_STOCKS,
  GROWTH_STOCKS,
} from '@/lib/globalUniverse';
import { MarketRegime } from '@/components/trading/MarketRegime';
import { RecommendationCard } from '@/components/trading/RecommendationCard';

export const dynamic = 'force-dynamic';

type Tab = 'us' | 'asia' | 'euruk' | 'growth';

const TAB_CONFIG: Record<Tab, {
  label: string;
  region: 'US' | 'ASIA' | 'EUR_UK' | 'GROWTH';
  description: string;
}> = {
  us: {
    label: 'US Stocks',
    region: 'US',
    description: 'S&P 500 blue-chips and large-caps screened for swing trade setups using Minervini trend template and technical analysis.',
  },
  asia: {
    label: 'Asia',
    region: 'ASIA',
    description: 'Top stocks from Japan (TSE), Hong Kong (HKEX), Korea (KRX), Singapore (SGX), Australia (ASX), and India (NSE).',
  },
  euruk: {
    label: 'EUR / UK',
    region: 'EUR_UK',
    description: 'Leading equities from the London Stock Exchange, Euronext Paris, Xetra Frankfurt, and Swiss Exchange.',
  },
  growth: {
    label: 'Growth & Penny',
    region: 'GROWTH',
    description: 'High-momentum growth and penny stocks. APLD-style pullback entries on AI, data center, EV, crypto-adjacent, and fintech names with elevated volatility.',
  },
};

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function RecommendationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawTab = params.tab ?? 'us';
  const activeTab: Tab = (['us', 'asia', 'euruk', 'growth'] as Tab[]).includes(rawTab as Tab)
    ? (rawTab as Tab)
    : 'us';

  const tabConfig = TAB_CONFIG[activeTab];

  // Fetch SPY for market regime + recommendations (with fallback)
  let marketRegime: 'BULLISH' | 'CAUTION' | 'BEARISH' = 'CAUTION';
  let results: Awaited<ReturnType<typeof fetchRecommendations>> = [];

  try {
    const spyCandles = await fetchYahooCandles('SPY').catch(() => []);
    marketRegime = calcMarketRegime(spyCandles);

    // Select the stock list for the active tab
    const stockLists: Record<Tab, typeof US_REC_STOCKS> = {
      us:     US_REC_STOCKS,
      asia:   ASIA_STOCKS,
      euruk:  EUR_UK_STOCKS,
      growth: GROWTH_STOCKS,
    };
    const stocks = stockLists[activeTab];

    results = await fetchRecommendations(stocks, tabConfig.region, marketRegime, 20).catch(() => []);
  } catch {
    results = [];
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1700px] mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Daily Recommendations</h1>
          <p className="text-gray-400 text-sm mt-1">
            Technical + fundamental analysis across global markets · Updated daily
          </p>
        </div>

        {/* Market Regime */}
        <div className="mb-6">
          <MarketRegime regime={marketRegime} />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-0 mb-6 border-b border-gray-800">
          {(Object.entries(TAB_CONFIG) as [Tab, typeof TAB_CONFIG[Tab]][]).map(([key, cfg]) => {
            const isActive = key === activeTab;
            return (
              <Link
                key={key}
                href={`/recommendations?tab=${key}`}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'border-blue-500 bg-blue-600/10 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                }`}
              >
                {cfg.label}
              </Link>
            );
          })}
        </div>

        {/* Tab Description */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 mb-5 text-sm text-gray-400">
          {tabConfig.description}
        </div>

        {/* Result Count */}
        <div className="text-sm text-gray-500 mb-4">
          {results.length} recommendation{results.length !== 1 ? 's' : ''} · sorted by signal strength + analyst upside
        </div>

        {/* Results Grid */}
        {results.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-10 text-center text-gray-500">
            No recommendations found for this region right now. Markets may be closed or data is temporarily unavailable.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {results.map((rec) => (
              <RecommendationCard key={rec.symbol} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
