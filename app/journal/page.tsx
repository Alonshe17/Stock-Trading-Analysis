import { JournalManager } from '@/components/trading/JournalManager';
import { TradingNav } from '@/components/trading/TradingNav';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Trading Journal' };

type Props = { searchParams: Promise<{ symbol?: string }> };

export default async function JournalPage({ searchParams }: Props) {
  const { symbol } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Nav */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-amber-400">📓</span> Trading Journal
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Record your trade ideas, setups, and thought process for every stock.
            </p>
          </div>
          <TradingNav />
        </div>

        <JournalManager defaultSymbol={symbol?.toUpperCase()} />

        <p className="mt-8 text-xs text-gray-700">
          Entries are private to your device. Use the same watchlist sync code on another device to share journal entries across devices.
        </p>
      </div>
    </div>
  );
}
