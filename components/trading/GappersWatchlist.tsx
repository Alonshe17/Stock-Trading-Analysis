'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { GapperResult, CatalystType, TradingStrategy } from '@/lib/gappersScanner';

type Props = {
  preMarket: GapperResult[];
  intraday:  GapperResult[];
};

type SubTab = 'pre-market' | 'intraday';

export function GappersWatchlist({ preMarket, intraday }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('pre-market');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rows = subTab === 'pre-market' ? preMarket : intraday;

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div>
      {/* Sub-tab switcher */}
      <div className="flex gap-1 p-1 bg-gray-900 rounded-xl border border-gray-800 mb-5 w-fit">
        <SubTabBtn active={subTab === 'pre-market'} onClick={() => setSubTab('pre-market')}>
          🌅 Pre-Market Gappers
          <span className="ml-1.5 text-[10px] rounded-full px-1.5 py-0.5 bg-gray-700 text-gray-400">
            {preMarket.length}
          </span>
        </SubTabBtn>
        <SubTabBtn active={subTab === 'intraday'} onClick={() => setSubTab('intraday')}>
          ⚡ Intraday Gappers (LIVE)
          <span className="ml-1.5 text-[10px] rounded-full px-1.5 py-0.5 bg-gray-700 text-gray-400">
            {intraday.length}
          </span>
        </SubTabBtn>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-800 p-12 text-center text-gray-600">
          <p className="text-sm">No {subTab === 'pre-market' ? 'pre-market' : 'intraday'} gappers found matching all criteria.</p>
          <p className="text-xs mt-1 text-gray-700">
            Filters: ≥ 2% gap · ≥ 50K shares traded · avg vol &gt; 500K · ATR ≥ $0.50 · short interest ≤ 30%
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-3 py-3 text-left">Symbol</th>
                <th className="px-3 py-3 text-right">Price</th>
                <th className="px-3 py-3 text-right">Gap %</th>
                <th className="px-3 py-3 text-right">Vol Today</th>
                <th className="px-3 py-3 text-right">Float (M)</th>
                <th className="px-3 py-3 text-right">ATR</th>
                <th className="px-3 py-3 text-right">Short %</th>
                <th className="px-3 py-3 text-center">Support / Resist</th>
                <th className="px-3 py-3 text-left">Sector</th>
                <th className="px-3 py-3 text-left">Catalyst</th>
                <th className="px-3 py-3 text-left">Strategy</th>
                <th className="px-3 py-3 text-center">Risk</th>
                <th className="px-3 py-3 text-center w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g, i) => {
                const key      = `${g.symbol}-${subTab}`;
                const isOpen   = expanded.has(key);
                const isUp     = g.gapDirection === 'up';
                const gapColor = isUp ? 'text-emerald-400' : 'text-red-400';
                const rowBg    = i % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/40';

                return (
                  <>
                    <tr
                      key={key}
                      className={`${rowBg} border-b border-gray-800/50 hover:bg-gray-800/40 cursor-pointer transition-colors`}
                      onClick={() => toggle(key)}
                    >
                      {/* Symbol + name */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/stock/${g.symbol}`}
                            onClick={e => e.stopPropagation()}
                            className="font-bold text-white hover:text-blue-400 transition-colors text-sm"
                          >
                            {g.symbol}
                          </Link>
                          <span className="text-[10px] text-gray-500 truncate max-w-[110px]">{g.name}</span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-3 py-2.5 text-right font-mono text-gray-200">
                        ${g.price.toFixed(2)}
                      </td>

                      {/* Gap % */}
                      <td className={`px-3 py-2.5 text-right font-bold ${gapColor}`}>
                        {isUp ? '+' : ''}{g.gapPct.toFixed(2)}%
                      </td>

                      {/* Volume today */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="text-gray-200 font-mono">{fmtVol(g.volumeToday)}</div>
                        <div className="text-[10px] text-gray-500">{g.volRatio.toFixed(2)}× avg</div>
                      </td>

                      {/* Float */}
                      <td className="px-3 py-2.5 text-right font-mono text-gray-300">
                        {g.floatSharesM != null ? `${g.floatSharesM.toFixed(1)}M` : '—'}
                      </td>

                      {/* ATR */}
                      <td className="px-3 py-2.5 text-right font-mono text-gray-300">
                        ${g.atr.toFixed(2)}
                      </td>

                      {/* Short % */}
                      <td className="px-3 py-2.5 text-right">
                        {g.shortInterestPct != null ? (
                          <span className={g.shortInterestPct > 15 ? 'text-orange-400 font-semibold' : 'text-gray-300'}>
                            {g.shortInterestPct.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>

                      {/* Support / Resistance */}
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-emerald-500">R ${g.resistance.toFixed(2)}</span>
                          <span className="text-[10px] text-red-500">S ${g.support.toFixed(2)}</span>
                        </div>
                      </td>

                      {/* Sector */}
                      <td className="px-3 py-2.5">
                        <span className="text-[11px] text-gray-400">{g.sector}</span>
                      </td>

                      {/* Catalyst */}
                      <td className="px-3 py-2.5 max-w-[180px]">
                        <CatalystBadge type={g.catalystType} />
                        {g.newsHeadline && g.newsHeadline !== 'No recent news found' && (
                          <a
                            href={g.newsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="block text-[10px] text-gray-500 hover:text-blue-400 mt-0.5 leading-tight line-clamp-2 transition-colors"
                          >
                            {g.newsHeadline}
                          </a>
                        )}
                        {g.newsAge && (
                          <span className="text-[10px] text-gray-600">{g.newsSource} · {g.newsAge}</span>
                        )}
                      </td>

                      {/* Strategy */}
                      <td className="px-3 py-2.5">
                        <StrategyBadge strategy={g.suggestedStrategy} />
                      </td>

                      {/* Risk */}
                      <td className="px-3 py-2.5 text-center">
                        <RiskBadge level={g.riskLevel} />
                      </td>

                      {/* Expand toggle */}
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-gray-600 text-xs select-none">
                          {isOpen ? '▲' : '▼'}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isOpen && (
                      <tr key={`${key}-detail`} className={`${rowBg} border-b border-gray-700`}>
                        <td colSpan={13} className="px-4 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                            {/* Strategy note */}
                            <div className="rounded-lg bg-gray-900 border border-gray-700 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-gray-300">Suggested Strategy</span>
                                <StrategyBadge strategy={g.suggestedStrategy} />
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">{g.strategyNote}</p>

                              {/* Key metrics row */}
                              <div className="grid grid-cols-3 gap-2 mt-3">
                                <MiniStat label="Prev Close"   value={`$${g.prevClose.toFixed(2)}`} />
                                <MiniStat label="ATR (14d)"    value={`$${g.atr.toFixed(2)}`} />
                                <MiniStat label="Avg Vol"      value={fmtVol(g.avgDailyVolume)} />
                                <MiniStat label="Support"      value={`$${g.support.toFixed(2)}`}    color="text-red-400" />
                                <MiniStat label="Resistance"   value={`$${g.resistance.toFixed(2)}`} color="text-emerald-400" />
                                <MiniStat label="Vol Ratio"    value={`${g.volRatio.toFixed(2)}×`}   color={g.volRatio > 1.5 ? 'text-amber-400' : 'text-gray-300'} />
                              </div>
                            </div>

                            {/* Fundamental catalyst */}
                            <div className="rounded-lg bg-gray-900 border border-gray-700 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-gray-300">Fundamental Catalyst</span>
                                <CatalystBadge type={g.catalystType} />
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">{g.fundamentalCatalyst}</p>

                              {/* News link */}
                              {g.newsHeadline && g.newsHeadline !== 'No recent news found' && (
                                <a
                                  href={g.newsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 flex items-start gap-1.5 rounded-md bg-gray-800 border border-gray-700 hover:border-blue-700 px-3 py-2 transition-colors group"
                                >
                                  <span className="text-blue-400 mt-0.5 text-xs shrink-0">↗</span>
                                  <div className="min-w-0">
                                    <p className="text-xs text-gray-300 group-hover:text-blue-300 transition-colors leading-tight line-clamp-2">
                                      {g.newsHeadline}
                                    </p>
                                    <p className="text-[10px] text-gray-600 mt-0.5">
                                      {g.newsSource}{g.newsAge ? ` · ${g.newsAge}` : ''}
                                    </p>
                                  </div>
                                </a>
                              )}

                              {/* Float / SI detail */}
                              {(g.floatSharesM != null || g.shortInterestPct != null) && (
                                <div className="flex gap-4 mt-3">
                                  {g.floatSharesM != null && (
                                    <div>
                                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Float</p>
                                      <p className="text-sm font-semibold text-gray-200">{g.floatSharesM.toFixed(1)}M shares</p>
                                      <p className="text-[10px] text-gray-600">
                                        {g.floatSharesM < 20  ? 'Very small float — explosive moves possible' :
                                         g.floatSharesM < 100 ? 'Small-mid float — elevated volatility' :
                                                                  'Large float — institutional-driven moves'}
                                      </p>
                                    </div>
                                  )}
                                  {g.shortInterestPct != null && (
                                    <div>
                                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Short Interest</p>
                                      <p className={`text-sm font-semibold ${g.shortInterestPct > 20 ? 'text-orange-400' : 'text-gray-200'}`}>
                                        {g.shortInterestPct.toFixed(1)}% of float
                                      </p>
                                      <p className="text-[10px] text-gray-600">
                                        {g.shortInterestPct > 25 ? 'Very high — squeeze risk elevated' :
                                         g.shortInterestPct > 15 ? 'Elevated — watch for short covering' :
                                                                    'Normal range'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-700">
        Data from Yahoo Finance. For educational purposes only — not financial advice.
        Pre-market gaps measured vs previous session close. Intraday gaps measured from previous close to current price.
      </p>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SubTabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center ${
        active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

function CatalystBadge({ type }: { type: CatalystType }) {
  const colors: Record<string, string> = {
    'Earnings Beat':         'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'Earnings Miss':         'bg-red-500/20 text-red-300 border-red-500/40',
    'Earnings Report':       'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'FDA Approval':          'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'FDA Rejection':         'bg-red-500/20 text-red-300 border-red-500/40',
    'FDA Catalyst':          'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'M&A / Acquisition':     'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'Partnership / Alliance':'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    'Major Contract':        'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    'Analyst Upgrade':       'bg-emerald-900/30 text-emerald-400 border-emerald-700/40',
    'Analyst Downgrade':     'bg-red-900/30 text-red-400 border-red-700/40',
    'Price Target Raise':    'bg-emerald-900/20 text-emerald-500 border-emerald-800/40',
    'Stock Split':           'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    'Share Buyback':         'bg-violet-500/20 text-violet-300 border-violet-500/40',
    'Debt Offering':         'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'Restructuring / Layoffs':'bg-amber-900/30 text-amber-400 border-amber-700/40',
    'Management Change':     'bg-slate-500/20 text-slate-300 border-slate-500/40',
    'Product Launch':        'bg-sky-500/20 text-sky-300 border-sky-500/40',
    'Short Squeeze Setup':   'bg-orange-500/20 text-orange-300 border-orange-500/40',
    'Unknown / Sector Move': 'bg-gray-800 text-gray-400 border-gray-700/40',
  };
  const cls = colors[type] ?? 'bg-gray-800 text-gray-400 border-gray-700/40';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold leading-tight ${cls}`}>
      {type}
    </span>
  );
}

function StrategyBadge({ strategy }: { strategy: TradingStrategy }) {
  const colors: Record<string, string> = {
    'Gap and Go':                   'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'Opening Range Breakout (ORB)': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'Gap Fill / Reversal':          'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'VWAP Reclaim':                 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'Fade the Gap (Short)':         'bg-red-500/20 text-red-300 border-red-500/40',
    'Short Squeeze Watch':          'bg-orange-500/20 text-orange-300 border-orange-500/40',
    'Momentum Continuation':        'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  };
  const cls = colors[strategy] ?? 'bg-gray-800 text-gray-400 border-gray-700/40';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold leading-tight ${cls}`}>
      {strategy}
    </span>
  );
}

function RiskBadge({ level }: { level: 'Very High' | 'High' | 'Medium' | 'Low' }) {
  const map = {
    'Very High': 'bg-red-500/20 text-red-300 border-red-500/40',
    'High':      'bg-orange-500/20 text-orange-300 border-orange-500/40',
    'Medium':    'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'Low':       'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold ${map[level]}`}>
      {level}
    </span>
  );
}

function MiniStat({ label, value, color = 'text-gray-200' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[9px] text-gray-600 uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-semibold font-mono ${color}`}>{value}</p>
    </div>
  );
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

import type React from 'react';
