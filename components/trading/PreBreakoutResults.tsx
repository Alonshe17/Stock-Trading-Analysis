'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WatchlistStar } from '@/components/trading/WatchlistStar';
import { AddToWatchlistButton } from '@/components/trading/AddToWatchlistButton';
import type { PreBreakoutResult, Stage, SetupGrade } from '@/lib/preBreakout';

// ── Config maps ────────────────────────────────────────────────────────────────

const GRADE_CFG: Record<SetupGrade, {
  label: string; badge: string; row: string; glow: string; dot: string;
}> = {
  A: {
    label: 'A — High Probability',
    badge: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50',
    row:   'bg-emerald-950/15',
    glow:  'shadow-emerald-900/20',
    dot:   'bg-emerald-400',
  },
  B: {
    label: 'B — Developing Setup',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
    row:   'bg-blue-950/10',
    glow:  '',
    dot:   'bg-blue-400',
  },
  C: {
    label: 'C — Watch List',
    badge: 'bg-amber-900/30 text-amber-400 border-amber-700/40',
    row:   '',
    glow:  '',
    dot:   'bg-amber-500',
  },
  D: {
    label: 'D — Not Ready',
    badge: 'bg-gray-800 text-gray-500 border-gray-700/40',
    row:   '',
    glow:  '',
    dot:   'bg-gray-600',
  },
};

const STAGE_CFG: Record<Stage, { label: string; color: string; short: string }> = {
  'stage2':       { label: 'Stage 2 — Perfect uptrend',     color: 'text-emerald-400', short: 'S2 ✓' },
  'stage2-early': { label: 'Stage 2 Early — Developing',    color: 'text-blue-400',    short: 'S2~'  },
  'stage1':       { label: 'Stage 1 — Basing near 200d MA', color: 'text-amber-400',   short: 'S1'   },
  'stage3':       { label: 'Stage 3 — Extended / Topping',  color: 'text-orange-400',  short: 'S3'   },
  'stage4':       { label: 'Stage 4 — Downtrend',           color: 'text-red-500',     short: 'S4'   },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtCap(m: number): string {
  if (m >= 1_000_000) return `$${(m / 1_000_000).toFixed(1)}T`;
  if (m >= 1_000)     return `$${(m / 1_000).toFixed(1)}B`;
  return `$${m.toFixed(0)}M`;
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ── Summary bar ────────────────────────────────────────────────────────────────

function SummaryBar({ results }: { results: PreBreakoutResult[] }) {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  let pivotCount = 0;
  for (const r of results) {
    counts[r.grade]++;
    if (r.pocketPivot) pivotCount++;
  }
  const total = results.length || 1;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 mb-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
          Setup Quality — {results.length} candidates found
        </p>
        {pivotCount > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-900/30 border border-orange-700/40 text-orange-400 text-xs font-bold">
            🔥 {pivotCount} Pocket Pivot{pivotCount > 1 ? 's' : ''} — active entry signal{pivotCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 mb-3">
        {(['A','B','C','D'] as SetupGrade[]).map(g => {
          const pct = (counts[g] / total) * 100;
          if (pct === 0) return null;
          return <div key={g} style={{ width: `${pct}%` }} className={`${GRADE_CFG[g].dot}`} />;
        })}
      </div>
      <div className="flex flex-wrap gap-4">
        {(['A','B','C','D'] as SetupGrade[]).map(g => (
          <div key={g} className="flex items-center gap-1.5 text-xs">
            <div className={`w-2.5 h-2.5 rounded-full ${GRADE_CFG[g].dot}`} />
            <span className="text-gray-400">{GRADE_CFG[g].label.split('—')[0].trim()}</span>
            <span className="text-gray-200 font-bold">{counts[g]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mini score bar ─────────────────────────────────────────────────────────────

function ScoreBar({ score, grade }: { score: number; grade: SetupGrade }) {
  const pct = (score / 10) * 100;
  const color =
    grade === 'A' ? 'bg-emerald-500' :
    grade === 'B' ? 'bg-blue-500'    :
    grade === 'C' ? 'bg-amber-500'   : 'bg-gray-600';
  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-bold ${
        grade === 'A' ? 'text-emerald-300' :
        grade === 'B' ? 'text-blue-400'    :
        grade === 'C' ? 'text-amber-400'   : 'text-gray-500'
      }`}>{score}/10</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden min-w-[48px]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Expanded signal detail ─────────────────────────────────────────────────────

function ExpandedDetail({ r }: { r: PreBreakoutResult }) {
  const sc = STAGE_CFG[r.stage];
  return (
    <tr className="border-b border-gray-800/40">
      <td colSpan={10} className="px-4 pb-5 pt-2">
        <div className={`rounded-xl border border-gray-800 p-4 ${GRADE_CFG[r.grade].row}`}>

          {/* Signal grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">

            {/* Stage */}
            <DetailCard icon="📊" title="Stage Analysis" color={sc.color}>
              <div className={`font-bold text-sm ${sc.color}`}>{sc.short}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{sc.label}</div>
              <div className="mt-1.5 space-y-0.5">
                <MaRow label="50d MA"  val={r.ma50}  price={r.price} />
                <MaRow label="150d MA" val={r.ma150} price={r.price} />
                <MaRow label="200d MA" val={r.ma200} price={r.price} />
              </div>
            </DetailCard>

            {/* Base tightness */}
            <DetailCard icon="🎯" title="Base Tightness" color={r.inBase ? 'text-emerald-400' : 'text-gray-400'}>
              <div className={`font-bold text-sm ${r.inBase ? 'text-emerald-400' : 'text-gray-400'}`}>
                {r.baseRangePct.toFixed(1)}% range
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {r.inBase ? '✓ In base (<15%)' : '✗ Wide range'}
              </div>
              <div className="text-[10px] text-gray-600 mt-1">
                H: ${r.baseHigh.toFixed(2)} · L: ${r.baseLow.toFixed(2)}
              </div>
              {r.vdu && (
                <div className="text-[10px] text-blue-400 mt-1 font-semibold">
                  💧 Volume Drying Up ({(r.vduRatio * 100).toFixed(0)}% of avg)
                </div>
              )}
            </DetailCard>

            {/* Up/Down vol ratio */}
            <DetailCard icon="⚖️" title="Up/Down Vol Ratio" color={r.upDownVolRatio >= 1.3 ? 'text-emerald-400' : r.upDownVolRatio < 0.8 ? 'text-red-400' : 'text-gray-400'}>
              <div className={`font-bold text-sm ${
                r.upDownVolRatio >= 1.3 ? 'text-emerald-400' :
                r.upDownVolRatio < 0.8 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {r.upDownVolRatio.toFixed(2)}×
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {r.upDownVolRatio >= 2 ? 'Strong institutional buying' :
                 r.upDownVolRatio >= 1.3 ? 'More buying than selling' :
                 r.upDownVolRatio < 0.8 ? 'More selling than buying' : 'Balanced'}
              </div>
              <div className="text-[10px] text-gray-600 mt-1">
                Up vol: {fmtVol(r.upVol)} · Down vol: {fmtVol(r.downVol)}
              </div>
            </DetailCard>

            {/* Relative Strength */}
            <DetailCard icon="💪" title="Relative Strength (60d)" color={r.rs60d >= 5 ? 'text-emerald-400' : r.rs60d >= 0 ? 'text-blue-400' : 'text-red-400'}>
              <div className={`font-bold text-sm ${r.rs60d >= 5 ? 'text-emerald-400' : r.rs60d >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {r.rs60d >= 0 ? '+' : ''}{r.rs60d.toFixed(1)}% vs SPY
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5 capitalize">{r.rsGrading}</div>
              <div className="text-[10px] text-gray-600 mt-1">
                Stock: {r.stockRet60d >= 0 ? '+' : ''}{r.stockRet60d.toFixed(1)}% · SPY: {r.spyRet60d >= 0 ? '+' : ''}{r.spyRet60d.toFixed(1)}%
              </div>
            </DetailCard>

            {/* OBV */}
            <DetailCard icon="📈" title="OBV Trend" color={r.obvTrend === 'rising' ? 'text-emerald-400' : r.obvTrend === 'falling' ? 'text-red-400' : 'text-gray-400'}>
              <div className={`font-bold text-sm capitalize ${r.obvTrend === 'rising' ? 'text-emerald-400' : r.obvTrend === 'falling' ? 'text-red-400' : 'text-gray-400'}`}>
                {r.obvTrend === 'rising' ? '▲ Rising' : r.obvTrend === 'falling' ? '▼ Falling' : '→ Flat'}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {r.obvTrend === 'rising' ? 'Hidden accumulation over 20 days' :
                 r.obvTrend === 'falling' ? 'Quiet distribution detected' : 'OBV sideways'}
              </div>
            </DetailCard>

            {/* 52-week position */}
            <DetailCard icon="🏔️" title="52-Week Position" color={r.fromHigh <= 5 ? 'text-amber-400' : r.fromHigh <= 15 ? 'text-blue-400' : 'text-gray-400'}>
              <div className={`font-bold text-sm ${r.fromHigh <= 5 ? 'text-amber-400' : r.fromHigh <= 15 ? 'text-blue-400' : 'text-gray-400'}`}>
                {r.fromHigh <= 0 ? 'AT HIGH 🔥' : `−${r.fromHigh.toFixed(1)}% from high`}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {r.fromHigh <= 5 ? 'Breakout zone' : r.fromHigh <= 15 ? 'Near high' : 'Building base'}
              </div>
              <div className="text-[10px] text-gray-600 mt-1">
                52w H: ${r.week52High.toFixed(2)} · 52w L: ${r.week52Low.toFixed(2)}
              </div>
            </DetailCard>

            {/* Pocket Pivot */}
            {r.pocketPivot && (
              <DetailCard icon="🔥" title="Pocket Pivot Active" color="text-orange-300">
                <div className="font-bold text-sm text-orange-300">Entry Signal!</div>
                <div className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                  Today&apos;s volume {r.ppVolRatio.toFixed(1)}× the largest down-day vol in last 10 sessions.
                  IBD pivot entry trigger.
                </div>
              </DetailCard>
            )}
          </div>

          {/* Catalyst bullets */}
          {r.catalysts.length > 0 && (
            <div className="pt-3 border-t border-gray-800/60">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Why This Stock Is Flagged</p>
              <div className="space-y-1">
                {r.catalysts.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <span className={c.includes('🔥') ? 'text-orange-400' : c.includes('underperform') ? 'text-red-400' : 'text-emerald-400'}>
                      {c.includes('🔥') ? '' : c.includes('underperform') ? '✗' : '✓'}
                    </span>
                    <span className={c.includes('underperform') ? 'text-red-400/80' : 'text-gray-300'}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Watchlist + Disclaimer */}
          <div className="mt-3 pt-2 border-t border-gray-800/40 flex items-center justify-between gap-3">
            <AddToWatchlistButton symbol={r.symbol} name={r.name} />
            <span className="text-[10px] text-gray-600 text-right">
              Not financial advice. Always verify with your own research.
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}

function MaRow({ label, val, price }: { label: string; val: number; price: number }) {
  const pct  = val > 0 ? ((price - val) / val) * 100 : 0;
  const above = price > val;
  return (
    <div className="flex justify-between items-center text-[10px]">
      <span className="text-gray-600">{label}</span>
      <span className={above ? 'text-emerald-500' : 'text-red-500'}>
        ${val.toFixed(2)} ({above ? '+' : ''}{pct.toFixed(1)}%)
      </span>
    </div>
  );
}

function DetailCard({ icon, title, color, children }: {
  icon: string; title: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-gray-900/70 border border-gray-800/60 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span>{icon}</span>
        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Main results component ────────────────────────────────────────────────────

export function PreBreakoutResults({ results }: { results: PreBreakoutResult[] }) {
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-800 p-12 text-center text-gray-600">
        No pre-breakout setups found. Try again after market hours for updated data.
      </div>
    );
  }

  return (
    <div>
      <SummaryBar results={results} />
      <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 860 }}>
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-500">
                <th className="text-left px-4 py-3 font-semibold">Symbol</th>
                <th className="text-right px-3 py-3 font-semibold">Price</th>
                <th className="text-right px-3 py-3 font-semibold">Chg</th>
                <th className="text-center px-3 py-3 font-semibold">Stage</th>
                <th className="text-center px-3 py-3 font-semibold">Base</th>
                <th className="text-center px-3 py-3 font-semibold">U/D Vol</th>
                <th className="text-center px-3 py-3 font-semibold">RS 60d</th>
                <th className="text-center px-3 py-3 font-semibold">OBV</th>
                <th className="text-center px-3 py-3 font-semibold">Score</th>
                <th className="text-center px-3 py-3 font-semibold">Grade</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <ResultRow key={r.symbol} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-4 text-[10px] text-gray-700 leading-relaxed">
        Stage 2 = price &gt; 50d MA &gt; 150d MA &gt; 200d MA (IBD trend template) · Base = 20-day range &lt;15% ·
        U/D Vol = up-day volume ÷ down-day volume over 20 sessions · RS = 60-day return vs SPY ·
        Pocket Pivot = today vol &gt; max down-day vol in last 10 bars · Score 0–10.
        Educational only — not financial advice.
      </p>
    </div>
  );
}

function ResultRow({ r }: { r: PreBreakoutResult }) {
  const [open, setOpen] = useState(false);
  const gc   = GRADE_CFG[r.grade];
  const sc   = STAGE_CFG[r.stage];

  return (
    <>
      <tr
        onClick={() => setOpen(v => !v)}
        className={`border-b border-gray-800/60 last:border-0 cursor-pointer hover:bg-gray-800/30 transition-colors select-none ${gc.row}`}
      >
        {/* Symbol */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${gc.dot}`} />
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/stock/${r.symbol}`}
                  onClick={e => e.stopPropagation()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-white hover:text-blue-400 transition-colors"
                >
                  {r.symbol}
                </Link>
                <WatchlistStar symbol={r.symbol} name={r.name} />
                {r.pocketPivot && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/40 border border-orange-700/40 text-orange-400 font-bold">
                    🔥 Pivot
                  </span>
                )}
                {r.vdu && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 border border-blue-700/40 text-blue-400 font-bold">
                    💧 VDU
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{r.name}</div>
            </div>
          </div>
        </td>

        {/* Price */}
        <td className="px-3 py-3 text-right text-gray-200 tabular-nums font-medium">
          ${r.price.toFixed(2)}
        </td>

        {/* Change % */}
        <td className={`px-3 py-3 text-right tabular-nums font-semibold ${
          r.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {r.changePct >= 0 ? '+' : ''}{r.changePct.toFixed(2)}%
        </td>

        {/* Stage */}
        <td className="px-3 py-3 text-center">
          <span className={`text-[11px] font-bold ${sc.color}`}>{sc.short}</span>
        </td>

        {/* Base */}
        <td className="px-3 py-3 text-center">
          {r.inBase ? (
            <span className="text-[11px] font-semibold text-emerald-400">
              {r.baseRangePct.toFixed(1)}% ✓
            </span>
          ) : (
            <span className="text-[11px] text-gray-600">{r.baseRangePct.toFixed(1)}%</span>
          )}
        </td>

        {/* Up/Down vol */}
        <td className="px-3 py-3 text-center">
          <span className={`text-[11px] font-bold ${
            r.upDownVolRatio >= 1.5 ? 'text-emerald-400' :
            r.upDownVolRatio >= 1.0 ? 'text-blue-400' : 'text-red-400'
          }`}>
            {r.upDownVolRatio.toFixed(2)}×
          </span>
        </td>

        {/* RS */}
        <td className="px-3 py-3 text-center">
          <span className={`text-[11px] font-bold ${
            r.rs60d >= 5 ? 'text-emerald-400' :
            r.rs60d >= 0 ? 'text-blue-400' : 'text-red-400'
          }`}>
            {r.rs60d >= 0 ? '+' : ''}{r.rs60d.toFixed(1)}%
          </span>
        </td>

        {/* OBV */}
        <td className="px-3 py-3 text-center">
          <span className={`text-sm font-bold ${
            r.obvTrend === 'rising' ? 'text-emerald-400' :
            r.obvTrend === 'falling' ? 'text-red-400' : 'text-gray-500'
          }`}>
            {r.obvTrend === 'rising' ? '▲' : r.obvTrend === 'falling' ? '▼' : '→'}
          </span>
        </td>

        {/* Score */}
        <td className="px-3 py-3 text-center min-w-[100px]">
          <ScoreBar score={r.score} grade={r.grade} />
        </td>

        {/* Grade */}
        <td className="px-3 py-3 text-center">
          <span className={`inline-block px-2.5 py-1 rounded-full border text-[11px] font-bold ${gc.badge}`}>
            {r.grade}
          </span>
          <div className="text-[9px] text-gray-600 mt-0.5">{open ? '▲ hide' : '▼ details'}</div>
        </td>
      </tr>

      {open && <ExpandedDetail r={r} />}
    </>
  );
}

import type React from 'react';
