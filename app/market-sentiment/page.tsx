'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { TradingNav } from '@/components/trading/TradingNav';
import type { SentimentPayload, VixData, PcrData, DistAccData, HistoricalPoint } from '@/app/api/market/sentiment/route';

// ── VIX Semi-circle Gauge ─────────────────────────────────────────────────────

function VixGauge({ value }: { value: number }) {
  const W = 260, H = 148;
  const cx = W / 2, cy = H - 18, R = 100, TW = 18;

  // deg=0 → left (cx-R, cy), deg=180 → right (cx+R, cy), through top
  function toXY(deg: number, r = R) {
    const rad = (deg - 180) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function arc(d0: number, d1: number, r = R, sw = TW): string {
    const s = toXY(d0, r), e = toXY(d1, r);
    const large = d1 - d0 > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
  }

  // VIX 10–45 → gauge 0°–180°
  const clamp    = Math.min(45, Math.max(10, value));
  const needleDeg = ((clamp - 10) / 35) * 180;
  const tip      = toXY(needleDeg, R * 0.72);

  // Zone boundaries (degrees)
  const z1 = ((15 - 10) / 35) * 180;  // ~25.7  low/moderate
  const z2 = ((20 - 10) / 35) * 180;  // ~51.4  moderate/elevated
  const z3 = ((30 - 10) / 35) * 180;  // ~102.9 elevated/extreme

  // Tick marks at 15, 20, 30
  function tick(vix: number) {
    const d = ((vix - 10) / 35) * 180;
    const inner = toXY(d, R - TW / 2 - 6);
    const outer = toXY(d, R + TW / 2 + 4);
    const lbl   = toXY(d, R + TW / 2 + 14);
    return { inner, outer, lbl, label: String(vix) };
  }
  const ticks = [tick(15), tick(20), tick(30)];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Track */}
      <path d={arc(0, 180)} fill="none" stroke="#1f2937" strokeWidth={TW + 6} strokeLinecap="butt" />
      {/* Zone arcs */}
      <path d={arc(0,  z1)} fill="none" stroke="#10b981" strokeWidth={TW} opacity={0.8} strokeLinecap="butt" />
      <path d={arc(z1, z2)} fill="none" stroke="#eab308" strokeWidth={TW} opacity={0.8} strokeLinecap="butt" />
      <path d={arc(z2, z3)} fill="none" stroke="#f97316" strokeWidth={TW} opacity={0.8} strokeLinecap="butt" />
      <path d={arc(z3, 180)} fill="none" stroke="#ef4444" strokeWidth={TW} opacity={0.8} strokeLinecap="butt" />
      {/* Tick marks */}
      {ticks.map((t) => (
        <g key={t.label}>
          <line
            x1={t.inner.x} y1={t.inner.y} x2={t.outer.x} y2={t.outer.y}
            stroke="#374151" strokeWidth={1.5}
          />
          <text x={t.lbl.x} y={t.lbl.y + 3} textAnchor="middle" fill="#4b5563" fontSize={9}>
            {t.label}
          </text>
        </g>
      ))}
      {/* End labels */}
      <text x={toXY(0, R + TW / 2 + 14).x} y={cy + 6}  textAnchor="middle" fill="#10b981" fontSize={9}>10</text>
      <text x={toXY(180, R + TW / 2 + 14).x} y={cy + 6} textAnchor="middle" fill="#ef4444" fontSize={9}>45</text>
      {/* Needle */}
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="#e5e7eb" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="#e5e7eb" />
      <circle cx={cx} cy={cy} r={2} fill="#111827" />
    </svg>
  );
}

// ── VIX 30-day Sparkline ──────────────────────────────────────────────────────

function VixSparkline({ data }: { data: { t: number; v: number }[] }) {
  if (data.length < 2) return null;
  const W = 300, H = 48;
  const vals = data.map(d => d.v);
  const min  = Math.min(...vals) * 0.97;
  const max  = Math.max(...vals) * 1.03;
  const span = max - min || 1;
  const pts  = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.v - min) / span) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `M ${pts[0]} ` + pts.slice(1).map(p => `L ${p}`).join(' ')
    + ` L ${W} ${H} L 0 ${H} Z`;
  const line = `M ${pts.join(' L ')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 44 }}>
      <defs>
        <linearGradient id="vixGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#60a5fa" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0}    />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#vixGrad)" />
      <path d={line} fill="none" stroke="#60a5fa" strokeWidth={1.5}
            strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── PCR Gradient Bar ──────────────────────────────────────────────────────────

function PcrBar({ pcr }: { pcr: number }) {
  const MAX  = 2.0;
  const pct  = Math.min(100, (pcr / MAX) * 100);
  const col  = pcr < 0.7 ? '#10b981' : pcr > 1.0 ? '#ef4444' : '#f59e0b';
  // marker positions
  const m07 = (0.7 / MAX) * 100;
  const m10 = (1.0 / MAX) * 100;
  return (
    <div className="mt-2 relative">
      <div className="h-2 w-full rounded-full bg-gray-800 overflow-visible relative">
        {/* filled track */}
        <div style={{ width: `${pct}%`, background: col }} className="h-full rounded-full" />
        {/* threshold ticks */}
        <div className="absolute inset-y-0 flex items-stretch pointer-events-none"
             style={{ left: `${m07}%` }}>
          <div className="w-px bg-gray-600 h-full" />
        </div>
        <div className="absolute inset-y-0 flex items-stretch pointer-events-none"
             style={{ left: `${m10}%` }}>
          <div className="w-px bg-gray-600 h-full" />
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
        <span className="text-emerald-600">0.0 Bullish</span>
        <span>0.7</span>
        <span>1.0</span>
        <span className="text-red-600">Bearish 2.0+</span>
      </div>
    </div>
  );
}

// ── Trajectory Chart ──────────────────────────────────────────────────────────

type TooltipState = {
  x: number;
  y: number;
  point: HistoricalPoint;
} | null;

function TrajectoryChart({ history }: { history: HistoricalPoint[] }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (history.length < 2) {
    return (
      <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">
        Not enough history data
      </div>
    );
  }

  // Chart is rendered newest-first in history; reverse to plot oldest→newest left→right
  const pts = [...history].reverse();

  const W = 860, H = 220;
  const PL = 64, PR = 56, PT = 20, PB = 36;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;

  // VIX y-axis: 0 to max+15%
  const vixVals = pts.map(p => p.vix).filter((v): v is number => v !== null);
  const vixMax = vixVals.length > 0 ? Math.max(...vixVals) * 1.15 : 50;
  const vixMin = 0;
  const vixRange = vixMax - vixMin || 1;

  // PCR y-axis: fixed 0–2.0
  const pcrMin = 0;
  const pcrMax = 2.0;
  const pcrRange = pcrMax - pcrMin;

  function xOf(i: number): number {
    return PL + (i / (pts.length - 1)) * plotW;
  }
  function yVix(v: number): number {
    return PT + plotH - ((v - vixMin) / vixRange) * plotH;
  }
  function yPcr(v: number): number {
    return PT + plotH - ((v - pcrMin) / pcrRange) * plotH;
  }

  // VIX polyline
  const vixPts = pts
    .map((p, i) => p.vix != null ? `${xOf(i).toFixed(1)},${yVix(p.vix).toFixed(1)}` : null)
    .filter((s): s is string => s !== null);
  const vixLine = vixPts.length > 1 ? `M ${vixPts.join(' L ')}` : '';

  // VIX area fill (connect endpoints to bottom)
  const vixArea = vixPts.length > 1
    ? `M ${vixPts[0]} ` + vixPts.slice(1).map(p => `L ${p}`).join(' ')
      + ` L ${xOf(pts.length - 1).toFixed(1)} ${(PT + plotH).toFixed(1)}`
      + ` L ${xOf(0).toFixed(1)} ${(PT + plotH).toFixed(1)} Z`
    : '';

  // QQQ PCR polyline (equity from CBOE)
  const qqqPts = pts
    .map((p, i) => p.qqqPcr != null ? `${xOf(i).toFixed(1)},${yPcr(p.qqqPcr).toFixed(1)}` : null)
    .filter((s): s is string => s !== null);
  const qqqLine = qqqPts.length > 1 ? `M ${qqqPts.join(' L ')}` : '';

  // SPX PCR polyline (index from CBOE)
  const spxPts = pts
    .map((p, i) => p.spxPcr != null ? `${xOf(i).toFixed(1)},${yPcr(p.spxPcr).toFixed(1)}` : null)
    .filter((s): s is string => s !== null);
  const spxLine = spxPts.length > 1 ? `M ${spxPts.join(' L ')}` : '';

  const hasPcr = qqqPts.length > 1 || spxPts.length > 1;

  // VIX Y axis ticks (5 ticks)
  const vixTicks = [0, 1, 2, 3, 4].map(i => {
    const v = vixMin + (i / 4) * vixMax;
    return { v: Math.round(v), y: yVix(v) };
  });

  // PCR Y axis ticks (5 ticks)
  const pcrTicks = [0, 0.5, 1.0, 1.5, 2.0].map(v => ({
    v,
    y: yPcr(v),
  }));

  // X axis labels every 5 points
  const xLabels: { label: string; x: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i % 5 === 0 || i === pts.length - 1) {
      xLabels.push({ label: pts[i].date, x: xOf(i) });
    }
  }

  // Background VIX zones
  const zones = [
    { vLow: 0,  vHigh: 15, fill: 'rgba(16,185,129,0.04)' },
    { vLow: 15, vHigh: 20, fill: 'rgba(234,179,8,0.06)'  },
    { vLow: 20, vHigh: 30, fill: 'rgba(249,115,22,0.07)' },
    { vLow: 30, vHigh: vixMax + 5, fill: 'rgba(239,68,68,0.08)'  },
  ];

  function handleMouseMove(e: React.MouseEvent<SVGRectElement>, i: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;
    setTooltip({ x: svgX, y: svgY, point: pts[i] });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex flex-wrap items-center gap-3">
        <div>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            VIX + PCR 30-Day Trajectory
          </span>
          <p className="text-[10px] text-gray-600 mt-0.5">
            Historical volatility and put/call ratio trends
          </p>
        </div>
        {/* Legend */}
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-400 inline-block rounded" />
            <span className="text-blue-400">VIX</span>
          </span>
          {hasPcr ? (
            <>
              {qqqPts.length > 1 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />
                  <span className="text-emerald-400">Equity PCR</span>
                </span>
              )}
              {spxPts.length > 1 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-violet-400 inline-block rounded" />
                  <span className="text-violet-400">Index PCR</span>
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-600 text-[10px] italic">PCR data unavailable</span>
          )}
        </div>
      </div>

      {/* SVG chart */}
      <div className="px-2 py-2 relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 200 }}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="trajVixGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#60a5fa" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0}    />
            </linearGradient>
            <clipPath id="plotClip">
              <rect x={PL} y={PT} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Plot area background */}
          <rect x={PL} y={PT} width={plotW} height={plotH} fill="#111827" rx={2} />

          {/* VIX background zones */}
          {zones.map((z, zi) => {
            const yTop = Math.max(PT, yVix(Math.min(z.vHigh, vixMax)));
            const yBot = Math.min(PT + plotH, yVix(z.vLow));
            if (yBot <= yTop) return null;
            return (
              <rect
                key={zi}
                x={PL} y={yTop}
                width={plotW} height={yBot - yTop}
                fill={z.fill}
                clipPath="url(#plotClip)"
              />
            );
          })}

          {/* Grid lines (VIX ticks) */}
          {vixTicks.map((t) => (
            <line
              key={t.v}
              x1={PL} y1={t.y} x2={PL + plotW} y2={t.y}
              stroke="#1f2937" strokeWidth={1}
            />
          ))}

          {/* PCR reference lines */}
          <line
            x1={PL} y1={yPcr(0.7)} x2={PL + plotW} y2={yPcr(0.7)}
            stroke="#10b981" strokeWidth={1} strokeDasharray="4 3" opacity={0.4}
            clipPath="url(#plotClip)"
          />
          <line
            x1={PL} y1={yPcr(1.0)} x2={PL + plotW} y2={yPcr(1.0)}
            stroke="#ef4444" strokeWidth={1} strokeDasharray="4 3" opacity={0.4}
            clipPath="url(#plotClip)"
          />

          {/* VIX area fill */}
          {vixArea && (
            <path
              d={vixArea}
              fill="url(#trajVixGrad)"
              clipPath="url(#plotClip)"
            />
          )}

          {/* VIX line */}
          {vixLine && (
            <path
              d={vixLine}
              fill="none"
              stroke="#60a5fa"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              clipPath="url(#plotClip)"
            />
          )}

          {/* QQQ PCR line */}
          {qqqLine && (
            <path
              d={qqqLine}
              fill="none"
              stroke="#10b981"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              clipPath="url(#plotClip)"
            />
          )}

          {/* SPX PCR line */}
          {spxLine && (
            <path
              d={spxLine}
              fill="none"
              stroke="#a78bfa"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              clipPath="url(#plotClip)"
            />
          )}

          {/* Left Y axis (VIX) labels */}
          {vixTicks.map((t) => (
            <text
              key={`vy-${t.v}`}
              x={PL - 6}
              y={t.y + 4}
              textAnchor="end"
              fill="#60a5fa"
              fontSize={9}
              opacity={0.7}
            >
              {t.v}
            </text>
          ))}
          <text
            x={PL - 48}
            y={PT + plotH / 2}
            textAnchor="middle"
            fill="#60a5fa"
            fontSize={9}
            opacity={0.6}
            transform={`rotate(-90, ${PL - 48}, ${PT + plotH / 2})`}
          >
            VIX
          </text>

          {/* Right Y axis (PCR) labels */}
          {pcrTicks.map((t) => (
            <text
              key={`pr-${t.v}`}
              x={PL + plotW + 6}
              y={t.y + 4}
              textAnchor="start"
              fill="#9ca3af"
              fontSize={9}
              opacity={0.7}
            >
              {t.v.toFixed(1)}
            </text>
          ))}
          <text
            x={PL + plotW + 46}
            y={PT + plotH / 2}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize={9}
            opacity={0.6}
            transform={`rotate(90, ${PL + plotW + 46}, ${PT + plotH / 2})`}
          >
            PCR
          </text>

          {/* X axis labels */}
          {xLabels.map((l) => (
            <text
              key={l.label + l.x}
              x={l.x}
              y={PT + plotH + 14}
              textAnchor="middle"
              fill="#6b7280"
              fontSize={9}
            >
              {l.label}
            </text>
          ))}

          {/* Hover zones */}
          {pts.map((p, i) => {
            const zoneW = plotW / pts.length;
            const zx = xOf(i) - zoneW / 2;
            return (
              <rect
                key={`hz-${i}`}
                x={Math.max(PL, zx)}
                y={PT}
                width={zoneW}
                height={plotH}
                fill="transparent"
                onMouseMove={(e) => handleMouseMove(e, i)}
              />
            );
          })}

          {/* Tooltip */}
          {tooltip && (() => {
            const p = tooltip.point;
            const lines: string[] = [
              p.date,
              p.vix != null ? `VIX: ${p.vix.toFixed(2)}` : 'VIX: —',
              p.qqqPcr != null ? `Equity PCR: ${p.qqqPcr.toFixed(2)}` : 'Equity PCR: —',
              p.spxPcr != null ? `Index PCR: ${p.spxPcr.toFixed(2)}` : 'Index PCR: —',
            ];
            const tw = 120, th = lines.length * 14 + 10;
            const tx = Math.min(tooltip.x + 10, W - tw - 4);
            const ty = Math.max(PT, Math.min(tooltip.y - th / 2, PT + plotH - th));
            return (
              <g>
                <rect x={tx} y={ty} width={tw} height={th} rx={4}
                  fill="#1f2937" stroke="#374151" strokeWidth={1} opacity={0.95} />
                {lines.map((line, li) => (
                  <text
                    key={li}
                    x={tx + 8}
                    y={ty + 14 + li * 14}
                    fill={li === 0 ? '#e5e7eb' : '#9ca3af'}
                    fontSize={10}
                    fontWeight={li === 0 ? 'bold' : 'normal'}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

// ── Config maps ───────────────────────────────────────────────────────────────

const CONDITION_CFG = {
  'confirmed-uptrend':      {
    label: 'Confirmed Uptrend', icon: '📈',
    banner: 'from-emerald-950 to-gray-950 border-emerald-800/50',
    badge:  'bg-emerald-500/15 border-emerald-600/40 text-emerald-400',
    desc:   'Market is in a healthy uptrend. Fewer than 5 distribution days. SPY trading above key moving averages.',
  },
  'uptrend-under-pressure': {
    label: 'Uptrend Under Pressure', icon: '⚠️',
    banner: 'from-amber-950 to-gray-950 border-amber-800/50',
    badge:  'bg-amber-500/15 border-amber-600/40 text-amber-400',
    desc:   'Distribution days are piling up. Institutions may be selling. Reduce exposure and tighten stops.',
  },
  'rally-attempt':          {
    label: 'Rally Attempt', icon: '🔄',
    banner: 'from-blue-950 to-gray-950 border-blue-800/50',
    badge:  'bg-blue-500/15 border-blue-600/40 text-blue-400',
    desc:   'Market attempting to recover from a pullback. Wait for a confirmed follow-through day before adding exposure.',
  },
  'downtrend':              {
    label: 'Market in Downtrend', icon: '📉',
    banner: 'from-red-950 to-gray-950 border-red-800/50',
    badge:  'bg-red-500/15 border-red-600/40 text-red-400',
    desc:   'SPY trading below both key moving averages. Capital preservation mode — reduce risk exposure significantly.',
  },
};

const SESSION_CFG = {
  distribution: { tag: 'D', bg: 'bg-red-900/40',     text: 'text-red-400',     desc: 'Distribution' },
  accumulation: { tag: 'A', bg: 'bg-emerald-900/40', text: 'text-emerald-400', desc: 'Accumulation'  },
  churning:     { tag: '~', bg: 'bg-amber-900/30',   text: 'text-amber-400',   desc: 'Churning'      },
  neutral:      { tag: '·', bg: 'bg-gray-800/40',    text: 'text-gray-500',    desc: 'Neutral'       },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function vixColor(vix: number | null): string {
  if (vix == null) return 'text-gray-600';
  if (vix < 15)  return 'text-emerald-400';
  if (vix < 20)  return 'text-yellow-400';
  if (vix < 30)  return 'text-orange-400';
  return 'text-red-400';
}

function pcrColor(pcr: number | null): string {
  if (pcr == null) return 'text-gray-600';
  if (pcr < 0.7) return 'text-emerald-400';
  if (pcr > 1.0) return 'text-red-400';
  return 'text-amber-400';
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 rounded-xl bg-gray-900" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(k => <div key={k} className="h-64 rounded-xl bg-gray-900" />)}
      </div>
      <div className="h-[240px] rounded-xl bg-gray-900" />
      <div className="h-72 rounded-xl bg-gray-900" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MarketSentimentPage() {
  const [data, setData]     = useState<SentimentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    fetch('/api/market/sentiment')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: SentimentPayload) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const vix     = data?.vix     ?? null;
  const pcrs    = data?.pcr     ?? [];
  const distAcc = data?.distAcc ?? null;
  const history = data?.history ?? [];
  const cond    = distAcc ? CONDITION_CFG[distAcc.marketCondition] : null;

  // Build a lookup map from dateISO to HistoricalPoint for session rows
  const historyMap = new Map<string, HistoricalPoint>();
  for (const pt of history) {
    historyMap.set(pt.dateISO, pt);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Breadcrumb + nav */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
          <div className="text-sm text-gray-500">
            <Link href="/watchlist" className="hover:text-gray-300">Watchlist</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-300">Market Sentiment</span>
          </div>
          <TradingNav active="/market-sentiment" />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-white">Market Sentiment</h1>
          {data?.asOf && (
            <span className="text-xs text-gray-600">
              Updated {new Date(data.asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {loading ? <Skeleton /> : error ? (
          <div className="text-center text-gray-500 py-20">Failed to load sentiment data. Please try again.</div>
        ) : (
          <div className="space-y-5">

            {/* ── Market Condition Banner ── */}
            {cond && distAcc && (
              <div className={`rounded-xl border bg-gradient-to-r ${cond.banner} p-5`}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl leading-none">{cond.icon}</span>
                    <div>
                      <div className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold mb-0.5">
                        Market Condition · IBD Methodology
                      </div>
                      <div className="text-2xl font-bold text-white">{cond.label}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:ml-auto mt-1">
                    <span className={`px-3 py-1 rounded-full border text-xs font-bold ${cond.badge}`}>
                      {distAcc.distributionDays} Distribution Day{distAcc.distributionDays !== 1 ? 's' : ''}
                    </span>
                    <span className={`px-3 py-1 rounded-full border border-gray-700/60 bg-gray-800/50 text-xs font-semibold
                      ${distAcc.spyVs50dma >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      SPY {distAcc.spyVs50dma >= 0 ? '+' : ''}{distAcc.spyVs50dma.toFixed(1)}% vs 50dma
                    </span>
                    <span className={`px-3 py-1 rounded-full border border-gray-700/60 bg-gray-800/50 text-xs font-semibold
                      ${distAcc.spyVs200dma >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      SPY {distAcc.spyVs200dma >= 0 ? '+' : ''}{distAcc.spyVs200dma.toFixed(1)}% vs 200dma
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-400 leading-relaxed max-w-3xl">{cond.desc}</p>
              </div>
            )}

            {/* ── Row: VIX + PCR cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

              {/* VIX */}
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      VIX · CBOE Volatility Index
                    </div>
                    <div className="text-[10px] text-gray-600 mt-0.5">Fear &amp; Greed gauge</div>
                  </div>
                  {vix && (
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      vix.level === 'extreme'  ? 'bg-red-900/50 text-red-400' :
                      vix.level === 'elevated' ? 'bg-orange-900/50 text-orange-400' :
                      vix.level === 'moderate' ? 'bg-yellow-900/50 text-yellow-400' :
                                                 'bg-emerald-900/50 text-emerald-400'
                    }`}>
                      {vix.level === 'extreme'  ? 'Extreme Fear' :
                       vix.level === 'elevated' ? 'High Fear'    :
                       vix.level === 'moderate' ? 'Moderate'     : 'Low Fear'}
                    </span>
                  )}
                </div>

                {vix ? (
                  <>
                    <VixGauge value={vix.current} />
                    <div className="flex items-baseline justify-center gap-2 -mt-2 mb-3">
                      <span className="text-4xl font-bold tabular-nums text-white">
                        {vix.current.toFixed(2)}
                      </span>
                      <span className={`text-sm font-semibold ${vix.change >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {vix.change >= 0 ? '+' : ''}{vix.change.toFixed(2)}
                        {' '}({vix.changePct >= 0 ? '+' : ''}{vix.changePct.toFixed(1)}%)
                      </span>
                    </div>

                    <div className="mb-1">
                      <div className="text-[10px] text-gray-600 mb-0.5">30-day VIX trend</div>
                      <VixSparkline data={vix.sparkline} />
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-[10px] text-center mt-2">
                      <div className="rounded-md bg-emerald-900/20 text-emerald-400 py-1">
                        &lt;15<div className="text-[9px] text-emerald-600">Calm</div>
                      </div>
                      <div className="rounded-md bg-yellow-900/20 text-yellow-400 py-1">
                        15–20<div className="text-[9px] text-yellow-600">Caution</div>
                      </div>
                      <div className="rounded-md bg-orange-900/20 text-orange-400 py-1">
                        20–30<div className="text-[9px] text-orange-600">Fear</div>
                      </div>
                      <div className="rounded-md bg-red-900/20 text-red-400 py-1">
                        &gt;30<div className="text-[9px] text-red-600">Panic</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-40 flex items-center justify-center text-gray-600 text-sm">
                    VIX data unavailable
                  </div>
                )}
              </div>

              {/* PCR cards */}
              {pcrs.length === 0 ? (
                <div className="sm:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-6
                                flex items-center justify-center text-gray-600 text-sm">
                  Options PCR data temporarily unavailable
                </div>
              ) : (
                pcrs.map((pcr: PcrData) => (
                  <div key={pcr.symbol} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                          {pcr.label}
                        </div>
                        <div className="text-[10px] text-gray-600 mt-0.5">
                          {pcr.symbol === 'QQQ' ? 'Retail-weighted sentiment' : 'Institutional-weighted sentiment'}
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        pcr.sentiment === 'bullish' ? 'bg-emerald-900/50 text-emerald-400' :
                        pcr.sentiment === 'bearish' ? 'bg-red-900/50 text-red-400'         :
                                                      'bg-amber-900/50 text-amber-400'
                      }`}>
                        {pcr.sentiment === 'bullish' ? '🐂 Bullish' :
                         pcr.sentiment === 'bearish' ? '🐻 Bearish' : '⚖️ Neutral'}
                      </span>
                    </div>

                    <div className="mt-4 mb-1">
                      <span className="text-5xl font-bold tabular-nums text-white">
                        {pcr.pcr.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">P/C ratio</span>
                    </div>

                    <PcrBar pcr={pcr.pcr} />

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-gray-800/60 p-3">
                        <div className="text-[10px] text-gray-500 mb-0.5">Put OI</div>
                        <div className="text-sm font-bold text-red-400 tabular-nums">
                          {pcr.putOI > 0
                            ? pcr.putOI >= 1_000_000
                              ? `${(pcr.putOI / 1_000_000).toFixed(2)}M`
                              : `${(pcr.putOI / 1_000).toFixed(0)}K`
                            : '—'}
                        </div>
                        {pcr.putVol > 0 && (
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            Vol: {pcr.putVol >= 1_000_000
                              ? `${(pcr.putVol / 1_000_000).toFixed(1)}M`
                              : `${(pcr.putVol / 1_000).toFixed(0)}K`}
                          </div>
                        )}
                      </div>
                      <div className="rounded-lg bg-gray-800/60 p-3">
                        <div className="text-[10px] text-gray-500 mb-0.5">Call OI</div>
                        <div className="text-sm font-bold text-emerald-400 tabular-nums">
                          {pcr.callOI > 0
                            ? pcr.callOI >= 1_000_000
                              ? `${(pcr.callOI / 1_000_000).toFixed(2)}M`
                              : `${(pcr.callOI / 1_000).toFixed(0)}K`
                            : '—'}
                        </div>
                        {pcr.callVol > 0 && (
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            Vol: {pcr.callVol >= 1_000_000
                              ? `${(pcr.callVol / 1_000_000).toFixed(1)}M`
                              : `${(pcr.callVol / 1_000).toFixed(0)}K`}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="mt-3 text-[10px] text-gray-400 font-medium leading-relaxed">
                      <span className="text-emerald-500 font-bold">PCR &lt;0.7</span> = more calls (bullish)
                      {' · '}
                      <span className="text-red-500 font-bold">PCR &gt;1.0</span> = more puts (bearish/hedging)
                      {' · '}Based on nearest expiry open interest
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* ── Trajectory Chart ── */}
            {history.length >= 2 && (
              <TrajectoryChart history={history} />
            )}

            {/* ── Distribution / Accumulation ── */}
            {distAcc && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-800 flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Distribution / Accumulation · SPY · Year to Date
                    </span>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      Tracks institutional buying (A) and selling (D) pressure via volume analysis
                    </p>
                  </div>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-900/30 border border-red-900/50 text-red-400 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {distAcc.distributionDays} Distribution
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-900/50 text-emerald-400 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {distAcc.accumulationDays} Accumulation
                    </span>
                  </div>
                </div>

                {/* Session table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ minWidth: 680 }}>
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-500">
                        <th className="text-left px-4 py-2.5 font-bold text-gray-300">Date</th>
                        <th className="text-right px-4 py-2.5 font-bold text-gray-300">SPY Close</th>
                        <th className="text-right px-4 py-2.5 font-bold text-gray-300">Change</th>
                        <th className="text-right px-4 py-2.5 font-bold text-gray-300">Vol Ratio</th>
                        <th className="text-center px-4 py-2.5 font-bold text-gray-300">Session Type</th>
                        <th className="text-right px-4 py-2.5 font-bold text-gray-300">VIX</th>
                        <th className="text-right px-4 py-2.5 font-bold text-emerald-500/80">QQQ PCR</th>
                        <th className="text-right px-4 py-2.5 font-bold text-violet-400/80">SPX PCR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distAcc.sessions.map((s, i) => {
                        const cfg = SESSION_CFG[s.type];
                        const hp  = historyMap.get(s.dateISO) ?? null;
                        const rowVix    = hp?.vix    ?? null;
                        const rowQqq    = hp?.qqqPcr ?? null;
                        const rowSpx    = hp?.spxPcr ?? null;
                        return (
                          <tr
                            key={i}
                            className={`border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30 transition-colors
                              ${s.type === 'distribution' ? 'bg-red-950/10' :
                                s.type === 'accumulation' ? 'bg-emerald-950/10' : ''}`}
                          >
                            <td className="px-4 py-3 text-gray-300 font-medium">{s.date}</td>
                            <td className="px-4 py-3 text-right text-gray-200 tabular-nums font-medium">
                              ${s.close.toFixed(2)}
                            </td>
                            <td className={`px-4 py-3 text-right font-semibold tabular-nums
                              ${s.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {s.changePct >= 0 ? '+' : ''}{s.changePct.toFixed(2)}%
                            </td>
                            <td className={`px-4 py-3 text-right tabular-nums
                              ${s.volRatio >= 1.5 ? 'text-white font-bold' :
                                s.volRatio >= 1.0 ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>
                              {s.volRatio.toFixed(2)}×
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
                                  text-[11px] font-bold ${cfg.bg} ${cfg.text}`}
                                title={cfg.desc}
                              >
                                <span className="font-mono text-xs">{cfg.tag}</span>
                                {cfg.desc}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-right tabular-nums font-bold text-sm ${vixColor(rowVix)}`}>
                              {rowVix != null ? rowVix.toFixed(2) : '—'}
                            </td>
                            <td className={`px-4 py-3 text-right tabular-nums font-bold text-sm ${pcrColor(rowQqq)}`}>
                              {rowQqq != null ? rowQqq.toFixed(2) : '—'}
                            </td>
                            <td className={`px-4 py-3 text-right tabular-nums font-bold text-sm ${pcrColor(rowSpx)}`}>
                              {rowSpx != null ? rowSpx.toFixed(2) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2.5 border-t border-gray-800/50 flex flex-wrap gap-4 text-[10px] text-gray-400 font-medium">
                  <span><span className="text-red-400 font-bold">D Distribution</span> = SPY down ≥0.2% on above-avg volume (institutional selling)</span>
                  <span><span className="text-emerald-400 font-bold">A Accumulation</span> = SPY up ≥0.2% on above-avg volume (institutional buying)</span>
                  <span><span className="text-amber-400 font-bold">~ Churning</span> = up on weak volume (lack of conviction)</span>
                  <span className="text-gray-400">Vol Ratio = session volume ÷ 20-day avg</span>
                  <span className="text-gray-500">VIX: <span className="text-emerald-400">&lt;15 Calm</span> · <span className="text-yellow-400">15–20 Caution</span> · <span className="text-orange-400">20–30 Fear</span> · <span className="text-red-400">30+ Panic</span></span>
                  <span className="text-gray-500">PCR: <span className="text-emerald-400">&lt;0.7 Bullish</span> · <span className="text-amber-400">0.7–1.0 Neutral</span> · <span className="text-red-400">&gt;1.0 Bearish</span></span>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-400">Disclaimer:</strong> Market sentiment indicators are supplementary tools and do not constitute financial advice.
              VIX reflects implied volatility of S&amp;P 500 options. PCR (live) uses nearest-expiry options data from Yahoo Finance — today&apos;s row in the table shows the live value.
              Historical daily PCR (QQQ &amp; SPX columns) is not available from free public APIs; the CBOE stopped publishing free CSVs after 2019.
              Distribution/Accumulation analysis follows IBD methodology applied to SPY ETF daily data.
              Always combine with your own research and risk management.
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
