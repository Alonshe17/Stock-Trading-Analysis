'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WatchlistStar } from '@/components/trading/WatchlistStar';
import { AddToWatchlistButton } from '@/components/trading/AddToWatchlistButton';
import type { VolumeScanResult, VolumePressure, OBVTrend, VolumeSignalLabel } from '@/lib/volumeScanner';

// ── Config maps ────────────────────────────────────────────────────────────────

const PRESSURE_CFG: Record<VolumePressure, {
  label: string; short: string;
  badge: string; row: string; dot: string;
}> = {
  'strong-accumulation': {
    label: 'Strong Accumulation', short: 'Strong Acc.',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    row:   'bg-emerald-950/10',
    dot:   'bg-emerald-400',
  },
  'accumulation': {
    label: 'Accumulation', short: 'Accumulation',
    badge: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40',
    row:   'bg-emerald-950/5',
    dot:   'bg-emerald-500',
  },
  'neutral': {
    label: 'Neutral', short: 'Neutral',
    badge: 'bg-gray-800 text-gray-400 border-gray-700/40',
    row:   '',
    dot:   'bg-gray-500',
  },
  'distribution': {
    label: 'Distribution', short: 'Distribution',
    badge: 'bg-red-900/30 text-red-400 border-red-700/40',
    row:   'bg-red-950/5',
    dot:   'bg-red-500',
  },
  'strong-distribution': {
    label: 'Strong Distribution', short: 'Strong Dist.',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    row:   'bg-red-950/10',
    dot:   'bg-red-400',
  },
};

const OBV_CFG: Record<OBVTrend, { label: string; color: string; icon: string }> = {
  'strong-rising':  { label: 'Strong ↑', color: 'text-emerald-400', icon: '▲▲' },
  'rising':         { label: 'Rising ↑', color: 'text-emerald-500', icon: '▲'  },
  'flat':           { label: 'Flat →',   color: 'text-gray-500',    icon: '→'  },
  'falling':        { label: 'Falling ↓',color: 'text-red-500',     icon: '▼'  },
  'strong-falling': { label: 'Strong ↓', color: 'text-red-400',     icon: '▼▼' },
};

const VOL_CFG: Record<VolumeSignalLabel, { label: string; color: string; bg: string }> = {
  'surge-up':   { label: 'Surge ↑',   color: 'text-emerald-300', bg: 'bg-emerald-900/40' },
  'surge-down': { label: 'Surge ↓',   color: 'text-red-300',     bg: 'bg-red-900/40'     },
  'elevated':   { label: 'Elevated',  color: 'text-amber-400',   bg: 'bg-amber-900/30'   },
  'normal':     { label: 'Normal',    color: 'text-gray-400',    bg: 'bg-gray-800/30'    },
  'low':        { label: 'Low',       color: 'text-gray-600',    bg: 'bg-gray-800/20'    },
};

// ── Format helpers ─────────────────────────────────────────────────────────────

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
function fmtCap(m: number): string {
  if (m >= 1_000_000) return `$${(m / 1_000_000).toFixed(2)}T`;
  if (m >= 1_000)     return `$${(m / 1_000).toFixed(1)}B`;
  return `$${m.toFixed(0)}M`;
}

// ── Score dots ─────────────────────────────────────────────────────────────────

function ScoreDots({ score }: { score: number }) {
  // Map -7…+9 to 0–9 filled dots for display
  const MAX = 9;
  const clamped = Math.max(-7, Math.min(9, score));
  const filled  = Math.round(((clamped + 7) / 16) * MAX);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: MAX }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < filled
              ? clamped >= 6 ? 'bg-emerald-400' :
                clamped >= 3 ? 'bg-emerald-600' :
                clamped >= 0 ? 'bg-gray-500' :
                clamped >= -2 ? 'bg-red-600' : 'bg-red-400'
              : 'bg-gray-800'
          }`}
        />
      ))}
    </div>
  );
}

// ── Signal Detail Tooltip (expand row) ────────────────────────────────────────

function SignalDetail({ result }: { result: VolumeScanResult }) {
  const pc = PRESSURE_CFG[result.pressure];
  return (
    <tr className="border-b border-gray-800/40">
      <td colSpan={9} className="px-4 pb-4 pt-1">
        <div className={`rounded-xl border border-gray-800 p-4 ${pc.row}`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">

            {/* Signal 1: Volume */}
            <SignalCard
              title="Volume Surge"
              value={`${result.volumeRatio.toFixed(2)}×`}
              sub={`${fmtVol(result.volumeToday)} today / ${fmtVol(result.avgVolume20d)} avg`}
              color={VOL_CFG[result.volumeSignal].color}
              icon="📊"
            />

            {/* Signal 2: OBV */}
            <SignalCard
              title="OBV Trend"
              value={OBV_CFG[result.obvTrend].label}
              sub={`Slope: ${result.obvSlope > 0 ? '+' : ''}${(result.obvSlope * 100).toFixed(1)}%`}
              color={OBV_CFG[result.obvTrend].color}
              icon="📈"
            />

            {/* Signal 3: VWAP */}
            <SignalCard
              title="vs VWAP Proxy"
              value={result.aboveVwap ? 'Above' : 'Below'}
              sub={`${result.vwapPct >= 0 ? '+' : ''}${result.vwapPct.toFixed(2)}% · Proxy $${result.vwapProxy.toFixed(2)}`}
              color={result.aboveVwap ? 'text-emerald-400' : 'text-red-400'}
              icon="📍"
            />

            {/* Signal 4: Short Interest */}
            <SignalCard
              title="Short Interest"
              value={result.shortPct != null ? `${result.shortPct.toFixed(1)}%` : 'N/A'}
              sub={
                result.shortPct != null && result.shortPriorPct != null
                  ? `Prior: ${result.shortPriorPct.toFixed(1)}% · ${result.shortTrend}`
                  : result.shortTrend !== 'unknown' ? result.shortTrend : 'Data unavailable'
              }
              color={
                result.shortTrend === 'decreasing' ? 'text-emerald-400' :
                result.shortTrend === 'increasing' ? 'text-red-400' : 'text-gray-400'
              }
              icon="🔻"
            />

            {/* Signal 5: 52w Proximity */}
            <SignalCard
              title="52-Week High"
              value={`${result.highProxPct <= 0 ? 'AT HIGH' : `-${result.highProxPct.toFixed(1)}%`}`}
              sub={`High: $${result.week52High.toFixed(2)} · Low: $${result.week52Low.toFixed(2)}`}
              color={result.nearBreakout ? 'text-amber-400' : 'text-gray-400'}
              icon="🏔️"
            />
          </div>

          {/* Signal breakdown bullets */}
          {result.signalBreakdown.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-800/60">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">Signal Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {result.signalBreakdown.map((b, i) => (
                  <span
                    key={i}
                    className={`text-[11px] px-2 py-0.5 rounded border font-medium ${
                      b.includes('(+') ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400' :
                      b.includes('(-') ? 'bg-red-950/40 border-red-800/40 text-red-400' :
                      'bg-gray-800/40 border-gray-700/40 text-gray-400'
                    }`}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Watchlist */}
          <div className="mt-3 pt-2 border-t border-gray-800/40">
            <AddToWatchlistButton symbol={result.symbol} name={result.name} />
          </div>
        </div>
      </td>
    </tr>
  );
}

function SignalCard({
  title, value, sub, color, icon,
}: { title: string; value: string; sub: string; color: string; icon: string }) {
  return (
    <div className="rounded-lg bg-gray-900/60 border border-gray-800/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-600 mt-0.5 truncate">{sub}</div>
    </div>
  );
}

// ── Summary bar ────────────────────────────────────────────────────────────────

function SummaryBar({ results }: { results: VolumeScanResult[] }) {
  const counts = {
    'strong-accumulation': 0, accumulation: 0, neutral: 0,
    distribution: 0, 'strong-distribution': 0,
  } as Record<VolumePressure, number>;
  for (const r of results) counts[r.pressure]++;

  const total = results.length || 1;
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 mb-4">
      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-3">
        Market Pressure Distribution — {results.length} stocks
      </p>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
        {(['strong-accumulation','accumulation','neutral','distribution','strong-distribution'] as VolumePressure[]).map(p => {
          const pct = (counts[p] / total) * 100;
          if (pct === 0) return null;
          const cfg = PRESSURE_CFG[p];
          return <div key={p} style={{ width: `${pct}%` }} className={`${cfg.dot} opacity-80`} />;
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {(['strong-accumulation','accumulation','neutral','distribution','strong-distribution'] as VolumePressure[]).map(p => {
          const cfg = PRESSURE_CFG[p];
          return (
            <div key={p} className="flex items-center gap-1.5 text-xs">
              <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-gray-400">{cfg.short}</span>
              <span className="text-gray-300 font-semibold">{counts[p]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function VolumeScannerResults({ results }: { results: VolumeScanResult[] }) {
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-800 p-12 text-center text-gray-600">
        No results matched the volume criteria.
      </div>
    );
  }

  return (
    <div>
      <SummaryBar results={results} />

      <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 780 }}>
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 bg-gray-900/60">
                <th className="text-left px-4 py-3 font-semibold">Symbol</th>
                <th className="text-right px-3 py-3 font-semibold">Price</th>
                <th className="text-right px-3 py-3 font-semibold">Change</th>
                <th className="text-center px-3 py-3 font-semibold">Vol Ratio</th>
                <th className="text-center px-3 py-3 font-semibold">OBV</th>
                <th className="text-center px-3 py-3 font-semibold">vs VWAP</th>
                <th className="text-center px-3 py-3 font-semibold">52w Hi</th>
                <th className="text-center px-3 py-3 font-semibold">Score</th>
                <th className="text-center px-3 py-3 font-semibold">Signal</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <ResultRow key={r.symbol} result={r} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-[10px] text-gray-700 leading-relaxed">
        Volume ratio = today&apos;s volume ÷ 20-day average · OBV = On-Balance Volume 14-day trend ·
        VWAP Proxy = 20-day volume-weighted typical price · Short interest via Yahoo Finance defaultKeyStatistics ·
        52-week proximity = % below annual high · Score range −7 to +9.
        For educational purposes only — not financial advice.
      </p>
    </div>
  );
}

// ── Individual row (click to expand) ──────────────────────────────────────────

function ResultRow({ result }: { result: VolumeScanResult }) {
  const pc  = PRESSURE_CFG[result.pressure];
  const obc = OBV_CFG[result.obvTrend];
  const vc  = VOL_CFG[result.volumeSignal];

  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        onClick={() => setOpen((v: boolean) => !v)}
        className={`border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30 cursor-pointer transition-colors select-none ${pc.row}`}
      >
        {/* Symbol + name */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pc.dot}`} />
            <div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/stock/${result.symbol}`}
                  onClick={e => e.stopPropagation()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-white hover:text-blue-400 transition-colors"
                >
                  {result.symbol}
                </Link>
                <WatchlistStar symbol={result.symbol} name={result.name} />
              </div>
              <div className="text-[10px] text-gray-500 truncate max-w-[120px]">
                {result.name}
              </div>
            </div>
          </div>
        </td>

        {/* Price */}
        <td className="px-3 py-3 text-right text-gray-200 tabular-nums font-medium">
          ${result.price.toFixed(2)}
        </td>

        {/* Change % */}
        <td className={`px-3 py-3 text-right tabular-nums font-semibold ${
          result.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {result.changePct >= 0 ? '+' : ''}{result.changePct.toFixed(2)}%
        </td>

        {/* Volume ratio */}
        <td className="px-3 py-3 text-center">
          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${vc.bg} ${vc.color}`}>
            {result.volumeRatio.toFixed(2)}× {vc.label}
          </span>
        </td>

        {/* OBV trend */}
        <td className={`px-3 py-3 text-center font-bold text-sm ${obc.color}`}>
          {obc.icon}
          <div className="text-[9px] font-normal text-gray-600 mt-0.5">{obc.label}</div>
        </td>

        {/* VWAP position */}
        <td className="px-3 py-3 text-center">
          <span className={`text-[11px] font-semibold ${
            result.aboveVwap ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {result.aboveVwap ? '▲ Above' : '▼ Below'}
          </span>
          <div className={`text-[9px] tabular-nums mt-0.5 ${
            result.vwapPct >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {result.vwapPct >= 0 ? '+' : ''}{result.vwapPct.toFixed(1)}%
          </div>
        </td>

        {/* 52w high proximity */}
        <td className="px-3 py-3 text-center">
          {result.nearBreakout ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-800/40 text-amber-400 text-[10px] font-bold">
              🔥 {result.highProxPct <= 0 ? 'AT HIGH' : `-${result.highProxPct.toFixed(1)}%`}
            </span>
          ) : (
            <span className="text-gray-500 text-[11px] tabular-nums">
              -{result.highProxPct.toFixed(1)}%
            </span>
          )}
        </td>

        {/* Score */}
        <td className="px-3 py-3 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className={`text-sm font-bold ${
              result.score >= 6 ? 'text-emerald-300' :
              result.score >= 3 ? 'text-emerald-500' :
              result.score >= 0 ? 'text-gray-400' :
              result.score >= -2 ? 'text-red-500' : 'text-red-300'
            }`}>
              {result.score > 0 ? '+' : ''}{result.score}
            </span>
            <ScoreDots score={result.score} />
          </div>
        </td>

        {/* Signal badge */}
        <td className="px-3 py-3 text-center">
          <span className={`inline-block px-2.5 py-1 rounded-full border text-[10px] font-bold whitespace-nowrap ${pc.badge}`}>
            {pc.short}
          </span>
          <div className="text-[9px] text-gray-600 mt-0.5">
            {open ? '▲ hide' : '▼ details'}
          </div>
        </td>
      </tr>

      {open && <SignalDetail result={result} />}
    </>
  );
}
