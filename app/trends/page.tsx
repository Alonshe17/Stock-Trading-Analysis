import Link from 'next/link';
import { fetchYahooCandles } from '@/lib/yahoofetch';
import { calcMarketRegime } from '@/lib/analysis';
import { fetchRecommendations } from '@/lib/recommendations';
import type { Recommendation } from '@/lib/recommendations';
import { TREND_UNIVERSE } from '@/lib/globalUniverse';
import type { StockMeta } from '@/lib/globalUniverse';
import {
  CATEGORY_META,
  STOCK_NOTES,
  detectDipOpportunity,
  getLongTermTrend,
  getFundamentalHealth,
} from '@/lib/trendAnalysis';
import type { StockCategory } from '@/lib/trendAnalysis';
import { MarketRegime } from '@/components/trading/MarketRegime';
import { TrendCard } from '@/components/trading/TrendCard';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ cat?: string }>;
}

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as StockCategory[];

type AnnotatedResult = {
  rec: Recommendation;
  dipAnalysis: ReturnType<typeof detectDipOpportunity>;
  longTermTrend: ReturnType<typeof getLongTermTrend>;
  fundamentalHealth: ReturnType<typeof getFundamentalHealth>;
  stockNote: string | null;
  category: StockCategory | null;
};

function dipSortWeight(a: AnnotatedResult): number {
  if (!a.dipAnalysis.isDip) return 10;
  if (a.dipAnalysis.severity === 'deep') return 1;
  if (a.dipAnalysis.severity === 'moderate') return 2;
  return 3;
}

function signalSortWeight(signal: string): number {
  const order: Record<string, number> = {
    BREAKOUT: 0,
    PULLBACK: 1,
    MEAN_REVERT: 2,
    WATCH: 3,
    NEUTRAL: 4,
    AVOID: 5,
  };
  return order[signal] ?? 6;
}

export default async function TrendsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawCat = params.cat ?? 'all';

  const activeCategory: StockCategory | 'all' =
    rawCat === 'all' || ALL_CATEGORIES.includes(rawCat as StockCategory)
      ? (rawCat as StockCategory | 'all')
      : 'all';

  let marketRegime: 'BULLISH' | 'CAUTION' | 'BEARISH' = 'CAUTION';
  let annotatedResults: AnnotatedResult[] = [];

  try {
    // Fetch SPY for market regime
    const spyCandles = await fetchYahooCandles('SPY').catch(() => []);
    marketRegime = calcMarketRegime(spyCandles);

    // Filter TREND_UNIVERSE by the active category
    const stocksToFetch: StockMeta[] =
      activeCategory === 'all'
        ? TREND_UNIVERSE
        : TREND_UNIVERSE.filter((s) => s.category === activeCategory);

    const rawResults = await fetchRecommendations(
      stocksToFetch,
      'US',
      marketRegime,
      30,
    ).catch(() => [] as Recommendation[]);

    // Annotate each result
    annotatedResults = rawResults.map((rec) => {
      // Find the category from TREND_UNIVERSE
      const meta = TREND_UNIVERSE.find((s) => s.symbol === rec.symbol);
      const category = (meta?.category as StockCategory) ?? null;

      return {
        rec,
        dipAnalysis: detectDipOpportunity(rec),
        longTermTrend: getLongTermTrend(rec.price, rec.ema200),
        fundamentalHealth: getFundamentalHealth(rec),
        stockNote: STOCK_NOTES[rec.symbol] ?? null,
        category,
      };
    });

    // Sort: dip opportunities first (deep > moderate > mild), then by signal strength
    annotatedResults.sort((a, b) => {
      const dipDiff = dipSortWeight(a) - dipSortWeight(b);
      if (dipDiff !== 0) return dipDiff;
      return signalSortWeight(a.rec.signal) - signalSortWeight(b.rec.signal);
    });
  } catch {
    annotatedResults = [];
  }

  const dipCount = annotatedResults.filter((r) => r.dipAnalysis.isDip).length;
  const deepDipCount = annotatedResults.filter(
    (r) => r.dipAnalysis.isDip && r.dipAnalysis.severity === 'deep',
  ).length;

  const activeMeta =
    activeCategory !== 'all' ? CATEGORY_META[activeCategory] : null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1700px] mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Trend Analysis by Category</h1>
          <p className="text-gray-400 text-sm mt-1">
            Sector-aware trend analysis with dip detection · Long-term thesis + technical setup · Updated daily
          </p>
        </div>

        {/* Market Regime */}
        <div className="mb-6">
          <MarketRegime regime={marketRegime} />
        </div>

        {/* Category Navigation Tabs */}
        <div className="flex gap-0 mb-6 border-b border-gray-800 overflow-x-auto">
          {/* All tab */}
          <Link
            href="/trends?cat=all"
            className={`flex-shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeCategory === 'all'
                ? 'border-amber-500 bg-amber-600/10 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
            }`}
          >
            All
          </Link>
          {ALL_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const isActive = cat === activeCategory;
            return (
              <Link
                key={cat}
                href={`/trends?cat=${encodeURIComponent(cat)}`}
                className={`flex-shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                  isActive
                    ? 'border-amber-500 bg-amber-600/10 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                }`}
              >
                <span className="mr-1.5" aria-hidden="true">{meta.icon}</span>
                {meta.label}
              </Link>
            );
          })}
        </div>

        {/* Category Investment Thesis Panel (only when a specific category is selected) */}
        {activeMeta && activeCategory !== 'all' && (
          <div
            className={`rounded-xl border p-5 mb-6 ${activeMeta.bgColor} ${activeMeta.borderColor}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl" aria-hidden="true">{activeMeta.icon}</span>
              <h2 className={`text-base font-bold ${activeMeta.color}`}>{activeMeta.label}</h2>
              <span className="text-xs text-gray-500 ml-1 border border-gray-700 rounded px-1.5 py-0.5">
                {activeMeta.horizon}
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed mb-4">{activeMeta.thesis}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                  Key Tailwinds
                </div>
                <ul className="space-y-1">
                  {activeMeta.tailwinds.map((t, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5 flex-shrink-0">↑</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                  Key Risks
                </div>
                <ul className="space-y-1">
                  {activeMeta.risks.map((r, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">↓</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Result Stats */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <span className="text-sm text-gray-500">
            {annotatedResults.length} result{annotatedResults.length !== 1 ? 's' : ''} ·{' '}
            sorted by dip opportunity + signal strength
          </span>
          {dipCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-700/50 bg-amber-900/20 text-amber-300">
              <span aria-hidden="true">🎯</span>
              {dipCount} dip opportunit{dipCount !== 1 ? 'ies' : 'y'} detected
              {deepDipCount > 0 && (
                <span className="text-amber-200 font-bold ml-1">
                  ({deepDipCount} deep)
                </span>
              )}
            </span>
          )}
        </div>

        {/* Results Grid */}
        {annotatedResults.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-10 text-center text-gray-500">
            No results found for this category right now. Markets may be closed or data is temporarily unavailable.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {annotatedResults.map(({ rec, dipAnalysis, longTermTrend, fundamentalHealth, stockNote, category }) => (
              <TrendCard
                key={rec.symbol}
                rec={rec}
                dipAnalysis={dipAnalysis}
                longTermTrend={longTermTrend}
                fundamentalHealth={fundamentalHealth}
                stockNote={stockNote}
                category={category}
                categoryMeta={category ? CATEGORY_META[category] : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
