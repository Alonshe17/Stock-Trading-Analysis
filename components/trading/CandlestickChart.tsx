'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Candle } from '@/lib/finnhub';

type Range = '1D' | '5D' | '1M' | '6M' | 'YTD' | '5Y';

type TooltipBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isUp: boolean;
  x: number;   // px from left edge of chart container
  y: number;   // px from top edge of chart container
};

type Props = {
  candles: Candle[];
  candles15m?: Candle[];
  height?: number;
  title?: string;
  showEma8?: boolean;
  showRangeSelector?: boolean;
  defaultRange?: Range;
};

const RANGES: Range[] = ['1D', '5D', '1M', '6M', 'YTD', '5Y'];

/** Returns the subset of daily candles (or 15m candles for 1D) to display. */
function getVisibleCandles(
  daily: Candle[],
  intraday: Candle[],
  range: Range,
): { data: Candle[]; is15m: boolean } {
  if (range === '1D') {
    if (intraday.length > 0) return { data: intraday, is15m: true };
    // fallback: last 2 calendar days of daily
    const cutoff = Date.now() / 1000 - 2 * 86_400;
    const slice = daily.filter((c) => c.t >= cutoff);
    return { data: slice.length > 0 ? slice : daily.slice(-2), is15m: false };
  }

  const now = Date.now() / 1000;
  let cutoff: number;

  switch (range) {
    case '5D':  cutoff = now - 7  * 86_400; break;  // 7 calendar ≈ 5 trading
    case '1M':  cutoff = now - 31 * 86_400; break;
    case '6M':  cutoff = now - 182 * 86_400; break;
    case 'YTD': cutoff = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000; break;
    case '5Y':  return { data: daily, is15m: false };
    default:    return { data: daily, is15m: false };
  }

  const filtered = daily.filter((c) => c.t >= cutoff);
  return { data: filtered.length > 0 ? filtered : daily, is15m: false };
}

function fmtDate(ts: number, is15m: boolean): string {
  const d = new Date(ts * 1000);
  if (is15m) {
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${date}  ${time}`;
  }
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtVol(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B';
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000)         return (v / 1_000).toFixed(1) + 'K';
  return String(v);
}

// ── Floating OHLCV tooltip ──────────────────────────────────────────────────
const TOOLTIP_W = 160; // approximate tooltip width in px
const TOOLTIP_H = 130; // approximate tooltip height in px
const OFFSET    = 14;  // gap between crosshair and tooltip edge

function TooltipOverlay({
  tooltip,
  containerRef,
}: {
  tooltip: TooltipBar;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const w = containerRef.current?.clientWidth  ?? 600;
  const h = containerRef.current?.clientHeight ?? 400;

  // Flip horizontally when crosshair is in the right 40% of the chart
  const flipX = tooltip.x > w * 0.6;
  // Flip vertically when crosshair is in the bottom 35%
  const flipY = tooltip.y > h * 0.65;

  const left = flipX ? tooltip.x - TOOLTIP_W - OFFSET : tooltip.x + OFFSET;
  const top  = flipY ? tooltip.y - TOOLTIP_H - OFFSET : tooltip.y + OFFSET;

  return (
    <div
      className="absolute pointer-events-none z-10 bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl px-3.5 py-2.5 text-xs backdrop-blur-sm"
      style={{ left, top, width: TOOLTIP_W }}
    >
      <div className="text-gray-400 font-medium mb-2 text-[11px] tracking-wide border-b border-gray-700/60 pb-1.5">
        {tooltip.date}
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <span className="text-gray-500">Open</span>
        <span className="text-gray-200 text-right font-mono tabular-nums">
          {tooltip.open.toFixed(2)}
        </span>
        <span className="text-gray-500">High</span>
        <span className="text-emerald-400 text-right font-mono tabular-nums">
          {tooltip.high.toFixed(2)}
        </span>
        <span className="text-gray-500">Low</span>
        <span className="text-red-400 text-right font-mono tabular-nums">
          {tooltip.low.toFixed(2)}
        </span>
        <span className="text-gray-500">Close</span>
        <span className={`text-right font-mono tabular-nums font-semibold ${tooltip.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {tooltip.close.toFixed(2)}
        </span>
        {tooltip.volume > 0 && (
          <>
            <span className="text-gray-500">Vol</span>
            <span className="text-gray-300 text-right font-mono tabular-nums">
              {fmtVol(tooltip.volume)}
            </span>
          </>
        )}
      </div>
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

export function CandlestickChart({
  candles,
  candles15m = [],
  height = 400,
  title,
  showEma8 = false,
  showRangeSelector = true,
  defaultRange = '6M',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded]     = useState(false);
  const [activeRange, setActiveRange] = useState<Range>(defaultRange);
  const [tooltip, setTooltip]       = useState<TooltipBar | null>(null);

  const getChartHeight = () => {
    if (expanded) return window.innerHeight - 56;
    return window.innerWidth < 640 ? 220 : height;
  };

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any = null;

    const { data: visibleCandles, is15m } = getVisibleCandles(candles, candles15m, activeRange);

    // Lookup map: timestamp → original candle (for volume + fallback OHLC)
    const candleMap = new Map(visibleCandles.map((c) => [c.t, c]));

    import('lightweight-charts').then((lc) => {
      if (!containerRef.current) return;

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
        timeScale: { borderColor: '#374151', timeVisible: is15m },
        width:  containerRef.current.clientWidth,
        height: getChartHeight(),
      });

      // ── Candlestick series ──────────────────────────────────────────────────
      const candleSeries = chart.addSeries(lc.CandlestickSeries, {
        upColor:        '#10b981',
        downColor:      '#ef4444',
        borderUpColor:  '#10b981',
        borderDownColor:'#ef4444',
        wickUpColor:    '#10b981',
        wickDownColor:  '#ef4444',
      });

      candleSeries.setData(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        visibleCandles.map((c) => ({ time: c.t as any, open: c.o, high: c.h, low: c.l, close: c.c })),
      );

      // ── EMA overlays (daily only; computed from full history for accuracy) ──
      if (!is15m) {
        const visibleTimes = new Set(visibleCandles.map((c) => c.t));

        if (showEma8 && candles.length >= 8) {
          const ema8All = calcEma(candles.map((c) => c.c), 8);
          const ema8Series = chart.addSeries(lc.LineSeries, { color: '#a855f7', lineWidth: 1, title: 'EMA 8' });
          ema8Series.setData(
            candles
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((c, i) => ({ time: c.t as any, value: ema8All[i] }))
              .filter((d) => !isNaN(d.value) && visibleTimes.has(d.time as number)),
          );
        }

        if (!showEma8 && candles.length >= 50) {
          const ema50All = calcEma(candles.map((c) => c.c), 50);
          const ema50Series = chart.addSeries(lc.LineSeries, { color: '#3b82f6', lineWidth: 1, title: 'EMA 50' });
          ema50Series.setData(
            candles
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((c, i) => ({ time: c.t as any, value: ema50All[i] }))
              .filter((d) => !isNaN(d.value) && visibleTimes.has(d.time as number)),
          );
        }

        if (candles.length >= 200) {
          const ema200All = calcEma(candles.map((c) => c.c), 200);
          const ema200Series = chart.addSeries(lc.LineSeries, { color: '#f59e0b', lineWidth: 1, title: 'EMA 200' });
          ema200Series.setData(
            candles
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((c, i) => ({ time: c.t as any, value: ema200All[i] }))
              .filter((d) => !isNaN(d.value) && visibleTimes.has(d.time as number)),
          );
        }
      }

      chart.timeScale().fitContent();

      // ── Shared tooltip builder (desktop hover + mobile tap) ─────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildTooltip = (param: any, persist = false) => {
        if (!param.time || !param.point) {
          if (!persist) setTooltip(null);
          return;
        }
        const ts = param.time as number;
        const candle = candleMap.get(ts);
        if (!candle) { if (!persist) setTooltip(null); return; }

        const barData = param.seriesData?.get(candleSeries);
        const close  = barData?.close ?? candle.c;
        const open   = barData?.open  ?? candle.o;
        const high   = barData?.high  ?? candle.h;
        const low    = barData?.low   ?? candle.l;

        setTooltip({
          date:   fmtDate(ts, is15m),
          open, high, low, close,
          volume: candle.v,
          isUp:   close >= open,
          x:      Math.round(param.point.x),
          y:      Math.round(param.point.y),
        });
      };

      // Desktop: follow crosshair on mouse move
      chart.subscribeCrosshairMove((param: any) => buildTooltip(param, false));

      // Mobile: show tooltip on tap; tapping blank area hides it
      chart.subscribeClick((param: any) => {
        if (!param.time || !param.point) { setTooltip(null); return; }
        buildTooltip(param, true);
      });

      // ── Resize handler ──────────────────────────────────────────────────────
      const handleResize = () => {
        if (chart && containerRef.current) {
          chart.applyOptions({
            width:  containerRef.current.clientWidth,
            height: getChartHeight(),
          });
        }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    });

    return () => {
      chart?.remove();
      setTooltip(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, candles15m, height, expanded, activeRange]);

  // Lock body scroll when expanded
  useEffect(() => {
    document.body.style.overflow = expanded ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [expanded]);

  const is15mView = activeRange === '1D' && candles15m.length > 0;

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
        {/* ── Title bar ──────────────────────────────────────────────────────── */}
        <div className="px-3 sm:px-4 py-2.5 border-b border-gray-800 flex flex-wrap items-center gap-x-3 gap-y-1.5 shrink-0">
          {/* Title + EMA legend */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {title && <span className="truncate text-sm font-medium text-gray-200">{title}</span>}
            {!is15mView && (
              <>
                {showEma8 ? (
                  <span className="text-xs text-purple-400 whitespace-nowrap">— EMA 8</span>
                ) : (
                  <span className="text-xs text-blue-400 whitespace-nowrap">— EMA 50</span>
                )}
                <span className="text-xs text-amber-400 whitespace-nowrap">— EMA 200</span>
              </>
            )}
            {is15mView && (
              <span className="text-xs text-gray-500 whitespace-nowrap">15-min intraday</span>
            )}
          </div>

          {/* Range selector */}
          {showRangeSelector && (
            <div className="flex items-center gap-0.5 bg-gray-900 rounded-lg p-0.5 border border-gray-800">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveRange(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeRange === r
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Expand / Collapse toggle */}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-gray-700 bg-gray-900 text-gray-400 hover:text-white hover:border-gray-500 transition shrink-0"
            title={expanded ? 'Close fullscreen' : 'Expand chart'}
          >
            {expanded ? (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Close</span>
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
                </svg>
                <span>Expand</span>
              </>
            )}
          </button>
        </div>

        {/* ── Chart + tooltip wrapper ─────────────────────────────────────────── */}
        <div className={`relative ${expanded ? 'flex-1' : ''}`}>
          <div ref={containerRef} className="w-full h-full" />

          {/* OHLCV hover tooltip — floats next to the crosshair */}
          {tooltip && (
            <TooltipOverlay tooltip={tooltip} containerRef={containerRef} />
          )}
        </div>
      </div>
    </>
  );
}
