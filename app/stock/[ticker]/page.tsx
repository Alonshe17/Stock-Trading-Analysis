import { notFound } from 'next/navigation';
import { getCandles, getProfile, getUpcomingEarnings, getCompanyNews, getFinancials } from '@/lib/finnhub';
import { analyze, calcMarketRegime } from '@/lib/analysis';
import { TechnicalPanel } from '@/components/trading/TechnicalPanel';
import { SwingSetup } from '@/components/trading/SwingSetup';
import { SignalBadge } from '@/components/trading/SignalBadge';
import { EarningsWarning } from '@/components/trading/EarningsWarning';
import { RiskCalculator } from '@/components/trading/RiskCalculator';
import { CandlestickChart } from '@/components/trading/CandlestickChart';
import { NewsPanel } from '@/components/trading/NewsPanel';
import { PriceAlertBell } from '@/components/trading/PriceAlertBell';
import { FundamentalsPanel } from '@/components/trading/FundamentalsPanel';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ ticker: string }> };

async function getData(ticker: string) {
  const symbol = ticker.toUpperCase();

  const [dailyCandles, candles15m, spyCandles, profile, news, financials] = await Promise.all([
    getCandles(symbol, 'D').catch(() => []),
    getCandles(symbol, '15').catch(() => []),
    getCandles('SPY', 'D').catch(() => []),
    getProfile(symbol).catch(() => null),
    getCompanyNews(symbol, 7).catch(() => []),
    getFinancials(symbol).catch(() => null),
  ]);

  if (dailyCandles.length === 0) return null;

  const marketRegime = calcMarketRegime(spyCandles);
  const analysis = analyze(symbol, dailyCandles, marketRegime);

  const today = new Date().toISOString().split('T')[0];
  const inFive = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
  const earnings = await getUpcomingEarnings(today, inFive).catch(() => []);
  const earningsEvent = earnings.find((e) => e.symbol === symbol);

  return { analysis, dailyCandles, candles15m, profile, marketRegime, earningsEvent, news, financials };
}

export default async function StockPage({ params }: Props) {
  const { ticker } = await params;
  const data = await getData(ticker);
  if (!data) notFound();

  const { analysis: a, dailyCandles, candles15m, profile, earningsEvent, news, financials } = data;
  const changePos = a.change >= 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4">
          <Link href="/watchlist" className="hover:text-gray-300">Watchlist</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-300">{a.symbol}</span>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-start gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-white">{a.symbol}</h1>
              {profile && <span className="text-gray-400 text-lg">{profile.name}</span>}
              <PriceAlertBell symbol={a.symbol} name={profile?.name ?? a.symbol} currentPrice={a.price} />
              <SignalBadge signal={a.signal} size="md" />
              {earningsEvent && <EarningsWarning date={earningsEvent.date} />}
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-4xl font-semibold text-white">${a.price.toFixed(2)}</span>
              <span className={`text-lg font-medium ${changePos ? 'text-emerald-400' : 'text-red-400'}`}>
                {changePos ? '+' : ''}{a.change.toFixed(2)}%
              </span>
            </div>
            {profile && (
              <div className="flex gap-4 mt-1 text-sm text-gray-500">
                <span>Market Cap: ${(profile.marketCap / 1000).toFixed(0)}B</span>
                <span>Sector: {profile.sector}</span>
                <span>Exchange: {profile.exchange}</span>
              </div>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-4 mb-6">
          <CandlestickChart
            candles={dailyCandles.slice(-252)}
            height={420}
            title={`${a.symbol} — Daily Chart (1 Year) · EMA 50 & EMA 200`}
          />
          {candles15m.length > 0 && (
            <CandlestickChart
              candles={candles15m}
              height={280}
              title={`${a.symbol} — 15-Minute Chart (Entry Timing)`}
            />
          )}
        </div>

        {/* Analysis grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <TechnicalPanel a={a} />
            <RiskCalculator atr={a.atr} price={a.price} />
          </div>
          <div className="space-y-4">
            <SwingSetup a={a} />
            <NewsPanel news={news} title={`${a.symbol} News`} />
          </div>
        </div>

        {/* Fundamentals */}
        {financials && (
          <div className="mt-6">
            <FundamentalsPanel financials={financials} symbol={a.symbol} />
          </div>
        )}

        {/* Strategy note */}
        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-xs text-gray-500">
          <strong className="text-gray-400">Disclaimer:</strong> This analysis is for educational purposes only and does not constitute financial advice.
          All signals are based on technical analysis and may not reflect future performance. Always do your own research and manage risk appropriately.
          {earningsEvent && (
            <span className="text-amber-400 ml-1">
              ⚠ Upcoming earnings on {earningsEvent.date} — price action signals near earnings are unreliable.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
