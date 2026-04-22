'use client';

import { useEffect, useRef, useState } from 'react';
import type { Candle } from '@/lib/finnhub';

type Props = {
  candles: Candle[];
  height?: number;
  title?: string;
  showEma8?: boolean;
};

export function CandlestickChart({ candles, height = 400, title, showEma8 = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  // Compute effective chart height based on expanded state and viewport
  const getChartHeight = () => {
    if (expanded) return window.innerHeight - 56; // full screen minus title bar
    return window.innerWidth < 640 ? 220 : height;
  };

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any = null;

    import('lightweight-charts').then((lc) => {
      if (!containerRef.current) return;

      // lightweight-charts v5 API
      chart = lc.createChart(containerRef.current, {
        layout: {
          background: { type: lc.ColorType.Solid, color: '#030712' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: '#1f2937' },
          horzLines: { color: '#1f2937' },
        },
        crosshair: { mode: lc.CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#374151' },
        timeScale: { borderColor: '#374151', timeVisible: true },
        width: containerRef.current.clientWidth,
        height: getChartHeight(),
      });

      // v5: addSeries(SeriesType, options)
      const candleSeries = chart.addSeries(lc.CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      candleSeries.setData(candles.map((c) => ({ time: c.t as any, open: c.o, high: c.h, low: c.l, close: c.c })));

      // EMA 8 line (for intraday scanner)
      if (showEma8 && candles.length >= 8) {
        const ema8Series = chart.addSeries(lc.LineSeries, { color: '#a855f7', lineWidth: 1, title: 'EMA 8' });
        const ema8Data = calcEma(candles.map((c) => c.c), 8);
        ema8Series.setData(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          candles.map((c, i) => ({ time: c.t as any, value: ema8Data[i] })).filter((d) => !isNaN(d.value)),
        );
      }

      // EMA 50 line
      if (!showEma8 && candles.length >= 50) {
        const ema50Series = chart.addSeries(lc.LineSeries, { color: '#3b82f6', lineWidth: 1, title: 'EMA 50' });
        const ema50Data = calcEma(candles.map((c) => c.c), 50);
        ema50Series.setData(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          candles.map((c, i) => ({ time: c.t as any, value: ema50Data[i] })).filter((d) => !isNaN(d.value)),
        );
      }

      // EMA 200 line
      if (candles.length >= 200) {
        const ema200Series = chart.addSeries(lc.LineSeries, { color: '#f59e0b', lineWidth: 1, title: 'EMA 200' });
        const ema200Data = calcEma(candles.map((c) => c.c), 200);
        ema200Series.setData(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          candles.map((c, i) => ({ time: c.t as any, value: ema200Data[i] })).filter((d) => !isNaN(d.value)),
        );
      }

      chart.timeScale().fitContent();

      const handleResize = () => {
        if (chart && containerRef.current) {
          chart.applyOptions({
            width: containerRef.current.clientWidth,
            height: getChartHeight(),
          });
        }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    });

    return () => {
      chart?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, height, expanded]);

  // Lock body scroll when expanded (prevents page from scrolling behind overlay)
  useEffect(() => {
    document.body.style.overflow = expanded ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [expanded]);

  return (
    <>
      {/* Dark backdrop when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        />
      )}

      <div
        className={`border border-gray-800 bg-gray-950 overflow-hidden transition-all duration-200 ${
          expanded
            ? 'fixed inset-0 z-50 rounded-none flex flex-col'
            : 'rounded-xl'
        }`}
      >
        {/* Title bar — always rendered so the expand button is always accessible */}
        <div className="px-3 sm:px-4 py-2.5 border-b border-gray-800 text-sm font-medium text-gray-300 flex items-center gap-2 shrink-0">
          {/* Legend dots */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {title && <span className="truncate text-sm font-medium text-gray-200">{title}</span>}
            {showEma8 ? (
              <span className="text-xs text-purple-400 whitespace-nowrap">— EMA 8</span>
            ) : (
              <span className="text-xs text-blue-400 whitespace-nowrap">— EMA 50</span>
            )}
            <span className="text-xs text-amber-400 whitespace-nowrap">— EMA 200</span>
          </div>

          {/* Expand / Collapse toggle */}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-gray-700 bg-gray-900 text-gray-400 hover:text-white hover:border-gray-500 transition shrink-0"
            title={expanded ? 'Close fullscreen' : 'Expand chart'}
          >
            {expanded ? (
              <>
                {/* X / close icon */}
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Close</span>
              </>
            ) : (
              <>
                {/* Expand arrows icon */}
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
                </svg>
                <span>Expand</span>
              </>
            )}
          </button>
        </div>

        {/* Chart container */}
        <div ref={containerRef} className={expanded ? 'flex-1' : ''} />
      </div>
    </>
  );
}

function calcEma(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(prev);
    } else {
      prev = values[i] * k + prev * (1 - k);
      result.push(prev);
    }
  }
  return result;
}
