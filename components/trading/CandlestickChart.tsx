'use client';

import { useEffect, useRef } from 'react';
import type { Candle } from '@/lib/finnhub';

type Props = {
  candles: Candle[];
  height?: number;
  title?: string;
  showEma8?: boolean;
};

export function CandlestickChart({ candles, height = 400, title, showEma8 = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

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
        height,
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
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    });

    return () => {
      chart?.remove();
    };
  }, [candles, height]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-gray-800 text-sm font-medium text-gray-300 flex items-center gap-3">
          {title}
          {showEma8 && <span className="text-xs text-purple-400">— EMA 8</span>}
          {!showEma8 && <span className="text-xs text-blue-400">— EMA 50</span>}
          <span className="text-xs text-amber-400">— EMA 200</span>
        </div>
      )}
      <div ref={containerRef} />
    </div>
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
