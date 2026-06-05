'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CandlestickChart } from './CandlestickChart';
import { WatchlistStar } from '@/components/trading/WatchlistStar';
import { AddToWatchlistButton } from '@/components/trading/AddToWatchlistButton';
import type { ScanResult, EmaStatus } from '@/lib/intraday';

const EMA_STATUS_LABEL: Record<EmaStatus, string> = {
  EMA8_CROSS_UP: 'EMA8 Cross ↑',
  ABOVE_BOTH: 'Above Both',
  BETWEEN: 'Between EMAs',
  BELOW_EMA8: 'Below EMA8',
  BELOW_BOTH: 'Below Both',
  NO_DATA: 'No Data',
};

const EMA_STATUS_COLOR: Record<EmaStatus, string> = {
  EMA8_CROSS_UP: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  ABOVE_BOTH: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  BETWEEN: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  BELOW_EMA8: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  BELOW_BOTH: 'text-red-400 bg-red-400/10 border-red-400/30',
  NO_DATA: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
};

export function ScannerResults({ results }: { results: ScanResult[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(symbol: string) {
    setExpanded((prev) => (prev === symbol ? null : symbol));
  }

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-700 p-12 text-center text-gray-500">
        <p className="text-sm">No candidates found matching the scan criteria.</p>
        <p className="text-xs mt-1">Try scanning during market hours (9:30 AM – 4:00 PM ET).</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/80">
            <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider w-8"></th>
            <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Change</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Vol Pace</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Volume</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Mkt Cap</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">TV Rating</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">EMA Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800 bg-gray-950">
      {results.map((r) => {
        const isOpen = expanded === r.symbol;
        const changePos = r.changePct >= 0;

        return (
          <React.Fragment key={r.symbol}>
          <tr className="hover:bg-gray-900/60 transition cursor-pointer" onClick={() => toggle(r.symbol)}>
              {/* Expand arrow */}
              <td className="px-3 py-2 text-gray-500 text-center">
                <span className={`inline-block transition-transform duration-200 text-xs ${isOpen ? 'rotate-90' : ''}`}>▶</span>
              </td>

              {/* Symbol */}
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">{r.symbol}</span>
                  <WatchlistStar symbol={r.symbol} name={r.name ?? r.symbol} />
                </div>
              </td>

              {/* Price */}
              <td className="px-3 py-2 text-right text-white font-semibold">${r.price.toFixed(2)}</td>

              {/* Change */}
              <td className={`px-3 py-2 text-right font-medium ${changePos ? 'text-emerald-400' : 'text-red-400'}`}>
                {changePos ? '+' : ''}{r.changePct.toFixed(2)}%
              </td>

              {/* Vol Pace */}
              <td className={`px-3 py-2 text-right font-semibold ${r.volPace >= 2 ? 'text-emerald-400' : r.volPace >= 1 ? 'text-amber-400' : 'text-gray-400'}`}>
                {r.volPace.toFixed(2)}x
              </td>

              {/* Volume */}
              <td className="px-3 py-2 text-right text-gray-300">{formatVolume(r.volume)}</td>

              {/* Market Cap */}
              <td className="px-3 py-2 text-right text-gray-400">${formatMarketCap(r.marketCap)}</td>

              {/* TradingView technical rating */}
              <td className="px-3 py-2 text-right text-gray-300">
                {r.tvRating ?? <span className="text-gray-600">—</span>}
              </td>

              {/* EMA Status */}
              <td className="px-3 py-2 text-right">
                <span className={`px-2 py-0.5 rounded border font-medium ${EMA_STATUS_COLOR[r.emaStatus]}`}>
                  {EMA_STATUS_LABEL[r.emaStatus]}
                </span>
              </td>
          </tr>

          {isOpen && (
            <tr>
              <td colSpan={9} className="bg-gray-950 border-t border-gray-800 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex gap-4">
                      <span>High: <span className="text-white">${r.high.toFixed(2)}</span></span>
                      <span>Low: <span className="text-white">${r.low.toFixed(2)}</span></span>
                      <span>EMA8: <span className="text-purple-400">${r.ema8.toFixed(2)}</span></span>
                      <span>EMA200: <span className="text-amber-400">${r.ema200.toFixed(2)}</span></span>
                      <span>Avg Vol: <span className="text-white">{formatVolume(r.avgVolume)}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <AddToWatchlistButton symbol={r.symbol} name={r.name ?? r.symbol} />
                      <Link
                        href={`/stock/${r.symbol}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-400 hover:text-blue-300 transition"
                      >
                        Full Analysis →
                      </Link>
                    </div>
                  </div>
                  <CandlestickChart
                    candles={r.candles.slice(-120)}
                    height={260}
                    title={`${r.symbol} — Daily (6 months) · EMA 8 & EMA 200`}
                    showEma8
                  />
                </div>
              </td>
            </tr>
          )}
          </React.Fragment>
        );
      })}
        </tbody>
      </table>
    </div>
  );
}


function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
}

function formatMarketCap(mCapM: number): string {
  if (mCapM >= 1_000_000) return `${(mCapM / 1_000_000).toFixed(1)}T`;
  if (mCapM >= 1_000) return `${(mCapM / 1_000).toFixed(0)}B`;
  return `${mCapM.toFixed(0)}M`;
}
