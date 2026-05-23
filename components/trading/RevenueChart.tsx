'use client';

import { useEffect, useState } from 'react';
import type { RevenueQuarterPoint, EarningsBeat } from '@/app/api/stocks/revenue/route';

// ── SVG layout ────────────────────────────────────────────────────────────────
const W      = 860;
const H      = 240;
const PL     = 72;   // left  — revenue axis
const PR     = 68;   // right — YoY growth % axis
const PT     = 20;
const PB     = 32;
const PLOT_W = W - PL - PR;
const PLOT_H = H - PT - PB;

// ── Helpers ───────────────────────────────────────────────────────────────────

function xOf(i: number, n: number): number {
  const step = PLOT_W / n;
  return PL + step * i + step / 2;
}

/** Auto-scale: show in $B if max >= 1000M, else $M */
function fmtRevenue(v: number, scaleB: boolean): string {
  if (scaleB) return `$${(v / 1000).toFixed(1)}B`;
  return `$${v.toFixed(0)}M`;
}

function fmtAxisRev(v: number, scaleB: boolean): string {
  if (scaleB) return `$${(v / 1000).toFixed(1)}B`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
  return `$${Math.round(v)}M`;
}

/** YoY only — null if prior-year quarter not in dataset (i < 4). */
function yoyOf(data: RevenueQuarterPoint[], i: number): number | null {
  if (i < 4) return null;
  const prev = data[i - 4].revenueM;
  if (!prev) return null;
  return ((data[i].revenueM - prev) / Math.abs(prev)) * 100;
}

/** Group by calendar year for summary cards. */
function annualSummary(data: RevenueQuarterPoint[]) {
  const map = new Map<number, RevenueQuarterPoint[]>();
  for (const q of data) {
    const yr = new Date(q.ts * 1000).getUTCFullYear();
    if (!map.has(yr)) map.set(yr, []);
    map.get(yr)!.push(q);
  }
  const years = [...map.keys()].sort((a, b) => a - b);
  return years.map((yr, i) => {
    const qs      = map.get(yr)!;
    const total   = qs.reduce((a, b) => a + b.revenueM, 0);
    const prev    = i > 0
      ? map.get(years[i - 1])!.reduce((a, b) => a + b.revenueM, 0)
      : null;
    const yoy     = prev && prev !== 0 ? ((total - prev) / Math.abs(prev)) * 100 : null;
    const full    = qs.length === 4;
    const label   = !full && qs.length === 1
      ? qs[0].label
      : full ? `FY ${yr}` : `${yr} (partial)`;
    return { year: yr, total, yoy, full, label };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RevenueChart({ symbol }: { symbol: string }) {
  const [data, setData]           = useState<RevenueQuarterPoint[] | null>(null);
  const [beat, setBeat]           = useState<EarningsBeat | null>(null);
  const [loading, setLoading]     = useState(true);
  const [hover, setHover]         = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setBeat(null);
    fetch(`/api/stocks/revenue?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.quarterly?.length) setData(d.quarterly);
        if (d?.earningsBeat)      setBeat(d.earningsBeat);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="border border-gray-800 bg-gray-950 rounded-xl p-4 animate-pulse">
        <div className="h-3 w-48 bg-gray-800 rounded mb-3" />
        <div className="flex gap-3 mb-4">
          {[0, 1, 2, 3].map((k) => <div key={k} className="h-16 w-28 bg-gray-900 rounded" />)}
        </div>
        <div className="h-44 bg-gray-900 rounded" />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const n      = data.length;
  const cards  = annualSummary(data);
  const scaleB = Math.max(...data.map((d) => d.revenueM)) >= 1000;

  // YoY values
  const yoyValues = data.map((_, i) => yoyOf(data, i));
  const hasYoY    = yoyValues.some((v) => v !== null);

  // ── Revenue (left) scale ──────────────────────────────────────────────────
  const revVals = data.map((d) => d.revenueM);
  const revMin  = 0;
  const revMax  = Math.max(...revVals);
  const revSpan = revMax - revMin || 1;
  const yRevMax = revMax + revSpan * 0.22;
  const revY    = (v: number) => PT + (1 - (v - revMin) / (yRevMax - revMin)) * PLOT_H;

  // ── YoY % (right) scale ───────────────────────────────────────────────────
  const gVals  = yoyValues.filter((v): v is number => v !== null);
  const gMin   = gVals.length ? Math.min(...gVals, 0) : -100;
  const gMax   = gVals.length ? Math.max(...gVals) : 100;
  const gSpan  = (gMax - gMin) || 100;
  const yGMin  = gMin - gSpan * 0.12;
  const yGMax  = gMax + gSpan * 0.22;
  const grwY   = (v: number) => PT + (1 - (v - yGMin) / (yGMax - yGMin)) * PLOT_H;

  // ── Geometry ──────────────────────────────────────────────────────────────
  const step = PLOT_W / n;
  const barW = Math.min(52, step * 0.60);

  // Revenue axis ticks
  const revTicks = Array.from({ length: 5 }, (_, i) => revMin + (i / 4) * yRevMax);

  // Growth axis ticks
  const grwTicks = Array.from({ length: 5 }, (_, i) => yGMin + (i / 4) * (yGMax - yGMin));

  // YoY polyline — only connect consecutive valid points
  const grwSegments: string[][] = [];
  let current: string[] = [];
  for (let i = 0; i < n; i++) {
    const v = yoyValues[i];
    if (v !== null) {
      current.push(`${xOf(i, n)},${grwY(v)}`);
    } else {
      if (current.length > 1) grwSegments.push(current);
      current = [];
    }
  }
  if (current.length > 1) grwSegments.push(current);

  return (
    <div className="border border-gray-800 bg-gray-950 rounded-xl overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-b border-gray-800 flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
          Revenue — Quarterly
        </span>
        <div className="ml-auto flex items-center gap-5 text-[10px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500/65" />
            Revenue ({scaleB ? '$B' : '$M'})
          </span>
          {hasYoY && (
            <span className="flex items-center gap-1.5">
              <svg width="20" height="8" viewBox="0 0 20 8">
                <line x1="0" y1="4" x2="20" y2="4" stroke="#60a5fa" strokeWidth="1.8" />
                <circle cx="10" cy="4" r="2.5" fill="#60a5fa" />
              </svg>
              YoY growth %
            </span>
          )}
        </div>
      </div>

      {/* ── Summary row: annual cards + earnings beat ─────────────────────── */}
      <div className="flex gap-2.5 px-4 py-3 border-b border-gray-800 overflow-x-auto scrollbar-none">

        {/* Annual revenue cards — YoY only shown for full years */}
        {cards.map((c, i) => {
          const isLatest = i === cards.length - 1;
          return (
            <div
              key={c.year}
              className={`shrink-0 rounded-lg px-4 py-2.5 min-w-[116px] border ${
                isLatest
                  ? 'bg-violet-900/20 border-violet-700/40'
                  : 'bg-gray-900/50 border-gray-800'
              }`}
            >
              <div className="text-[10px] text-gray-500 mb-1">{c.label}</div>
              <div className="text-sm font-bold text-white">
                {fmtRevenue(c.total, scaleB)}
              </div>
              {/* Only show YoY for full years — partial-year comparisons are misleading */}
              {c.full && c.yoy !== null && (
                <div className={`text-[10px] font-semibold mt-0.5 ${
                  c.yoy >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {c.yoy >= 0 ? '+' : ''}{c.yoy.toFixed(0)}% YoY
                </div>
              )}
            </div>
          );
        })}

        {/* Earnings beat card */}
        {beat && (
          <div className="shrink-0 rounded-lg px-4 py-2.5 min-w-[148px] border border-blue-800/40 bg-blue-900/10 ml-auto">
            <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
              <span className="text-blue-400">●</span> Earnings · {beat.quarterLabel}
            </div>
            <div className="flex gap-3 mt-1">
              <div>
                <div className={`text-sm font-bold ${beat.epsSurprisePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {beat.epsSurprisePct >= 0 ? '+' : ''}{beat.epsSurprisePct.toFixed(2)}%
                </div>
                <div className="text-[9px] text-gray-500 mt-0.5">EPS Beat</div>
              </div>
              {beat.revenueYoyPct !== null && (
                <div className="border-l border-gray-700 pl-3">
                  <div className={`text-sm font-bold ${beat.revenueYoyPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {beat.revenueYoyPct >= 0 ? '+' : ''}{beat.revenueYoyPct.toFixed(1)}%
                  </div>
                  <div className="text-[9px] text-gray-500 mt-0.5">Rev YoY</div>
                </div>
              )}
            </div>
            <div className="text-[9px] text-gray-600 mt-1.5">
              EPS {beat.epsActual >= 0 ? '$' : '-$'}{Math.abs(beat.epsActual).toFixed(2)} vs est ${beat.epsEstimate.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* ── SVG combo chart ────────────────────────────────────────────────── */}
      <div className="px-1 py-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 200, display: 'block' }}
          onMouseLeave={() => setHover(null)}
        >
          {/* Grid lines */}
          {revTicks.map((v, i) => (
            <line key={i} x1={PL} y1={revY(v)} x2={W - PR} y2={revY(v)}
              stroke="#1f2937" strokeWidth={1} />
          ))}

          {/* Left axis — Revenue */}
          {revTicks.map((v, i) => (
            <text key={i} x={PL - 6} y={revY(v) + 4} textAnchor="end"
              fill="#4b5563" fontSize={10} fontFamily="ui-monospace,monospace">
              {fmtAxisRev(v, scaleB)}
            </text>
          ))}

          {/* Right axis — YoY % */}
          {hasYoY && grwTicks.map((v, i) => (
            <text key={i} x={W - PR + 7} y={grwY(v) + 4} textAnchor="start"
              fill="#60a5fa" fontSize={10} fontFamily="ui-monospace,monospace" opacity={0.8}>
              {v >= 0 ? '+' : ''}{Math.round(v)}%
            </text>
          ))}

          {/* ── Revenue bars ── */}
          {data.map((d, i) => {
            const cx     = xOf(i, n);
            const isLast = i === n - 1;
            const top    = revY(d.revenueM);
            const bH     = Math.max(revY(0) - top, 1);
            const fill   = isLast
              ? 'rgba(167,139,250,0.72)'
              : 'rgba(52,211,153,0.65)';

            return (
              <rect key={i}
                x={cx - barW / 2} y={top}
                width={barW} height={bH}
                fill={fill} rx={2}
              />
            );
          })}

          {/* ── YoY growth line ── */}
          {hasYoY && grwSegments.map((pts, si) => (
            <polyline key={si} points={pts.join(' ')} fill="none"
              stroke="#60a5fa" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}

          {/* ── Per-quarter: dot + x-label + hover ── */}
          {data.map((d, i) => {
            const cx    = xOf(i, n);
            const yoy   = yoyValues[i];
            const isHov = hover === i;
            const zoneX = PL + step * i;

            const ttW = 136;
            const ttH = yoy !== null ? 58 : 40;
            const ttX = Math.min(Math.max(cx - ttW / 2, PL), W - PR - ttW);

            return (
              <g key={i}>
                {/* Hover zone */}
                <rect x={zoneX} y={PT} width={step} height={PLOT_H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  style={{ cursor: 'crosshair' }}
                />

                {/* YoY dot */}
                {yoy !== null && (
                  <circle cx={cx} cy={grwY(yoy)}
                    r={isHov ? 5 : 3.5}
                    fill="#60a5fa" stroke="#030712" strokeWidth={1.5}
                  />
                )}

                {/* X-axis label */}
                <text x={cx} y={H - 4} textAnchor="middle"
                  fill={isHov ? '#d1d5db' : '#4b5563'} fontSize={9.5}>
                  {d.label}
                </text>

                {/* Hover tooltip */}
                {isHov && (
                  <g>
                    <rect x={ttX} y={PT + 4} width={ttW} height={ttH}
                      rx={4} fill="#111827" stroke="#374151" strokeWidth={1} />
                    <text x={ttX + ttW / 2} y={PT + 18}
                      textAnchor="middle" fill="#9ca3af" fontSize={10}>
                      {d.label}
                    </text>
                    <text x={ttX + ttW / 2} y={PT + 35}
                      textAnchor="middle" fill="#10b981"
                      fontSize={13} fontWeight="700"
                      fontFamily="ui-monospace,monospace">
                      {fmtRevenue(d.revenueM, scaleB)}
                    </text>
                    {yoy !== null && (
                      <text x={ttX + ttW / 2} y={PT + 52}
                        textAnchor="middle"
                        fill={yoy >= 0 ? '#10b981' : '#ef4444'}
                        fontSize={10} fontWeight="600">
                        YoY {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
