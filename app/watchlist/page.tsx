import { WATCHLIST } from '@/lib/watchlist';
import { WatchlistManager } from '@/components/trading/WatchlistManager';

export default function WatchlistPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Watchlist</h1>
          <p className="text-gray-400 text-sm mt-1">
            Add any US ticker · Hover a card to remove or refresh · Click to open full chart
          </p>
        </div>
        <WatchlistManager defaults={WATCHLIST} />
      </div>
    </div>
  );
}
