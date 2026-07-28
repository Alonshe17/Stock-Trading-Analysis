'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { GapperResult, CatalystType, TradingStrategy } from '@/lib/gappersScanner';

// ── Market session detection (client-side ET) ─────────────────────────────────

type Session = {
  label: 'Pre-Market' | 'Market Open' | 'After Hours' | 'Market Closed';
  color: string;
  dot: string;
  active: boolean;
};

function getMarketSession(): Session {
  const now   = new Date();
  const etStr = now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const [hStr, mStr] = etStr.split(':');
  const etTime = parseInt(hStr, 10) + parseInt(mStr, 10) / 60;

  if (etTime >= 4 && etTime < 9.5)  return { label: 'Pre-Market',    color: 'text-amber-400',   dot: 'bg-amber-400',   active: true  };
  if (etTime >= 9.5 && etTime < 16) return { label: 'Market Open',   color: 'text-emerald-400', dot: 'bg-emerald-400', active: true  };
  if (etTime >= 16 && etTime < 20)  return { label: 'After Hours',   color: 'text-orange-400',  dot: 'bg-orange-400',  active: true  };
  return                                     { label: 'Market Closed', color: 'text-gray-500',    dot: 'bg-gray-600',    active: false };
}

// ── Category helpers ──────────────────────────────────────────────────────────

function floatCategory(floatM: number | null): { label: string; color: string } | null {
  if (floatM == null) return null;
  if (floatM <= 10)  return { label: 'Low Float',    color: 'text-orange-400' };
  if (floatM <= 100) return { label: 'Medium Float', color: 'text-amber-400'  };
  return               { label: 'High Float',   color: 'text-gray-400'   };
}

function marketCapCategory(cap: number): { label: string; color: string } {
  if (cap >= 200_000_000_000) return { label: 'Mega-cap',  color: 'text-violet-400' };
  if (cap >= 10_000_000_000)  return { label: 'Large-cap', color: 'text-blue-400'   };
  if (cap >= 2_000_000_000)   return { label: 'Mid-cap',   color: 'text-cyan-400'   };
  if (cap >= 250_000_000)     return { label: 'Small-cap', color: 'text-emerald-400'};
  if (cap >= 50_000_000)      return { label: 'Micro-cap', color: 'text-amber-400'  };
  return                              { label: 'Nano-cap',  color: 'text-red-400'    };
}

function fmtCap(n: number): string {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000)     return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)         return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCsv(rows: GapperResult[], tabLabel: string) {
  const headers = [
    'Symbol','Name','Sector','Gap Type','Gap Direction','Gap %',
    'Price','Prev Close',
    'Vol Today','Avg Daily Vol','Vol Ratio',
    'Market Cap','Market Cap Category',
    'Float (M shares)','Float Category',
    'ATR','Short Interest %',
    'Support','Resistance',
    'Catalyst','Strategy','Risk Level',
    'News Headline','News Source','News Age','News URL',
  ];

  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.join(','),
    ...rows.map(g => {
      const capCat = g.marketCap > 0 ? marketCapCategory(g.marketCap).label : '';
      const floatCat = g.floatSharesM != null ? floatCategory(g.floatSharesM)?.label ?? '' : '';
      return [
        g.symbol, g.name, g.sector, g.gapType, g.gapDirection,
        g.gapPct.toFixed(2), g.price.toFixed(2), g.prevClose.toFixed(2),
        g.volumeToday, g.avgDailyVolume, g.volRatio.toFixed(2),
        g.marketCap > 0 ? g.marketCap : '', capCat,
        g.floatSharesM != null ? g.floatSharesM.toFixed(1) : '', floatCat,
        g.atr.toFixed(2),
        g.shortInterestPct != null ? g.shortInterestPct.toFixed(1) : '',
        g.support.toFixed(2), g.resistance.toFixed(2),
        g.catalystType, g.suggestedStrategy, g.riskLevel,
        g.newsHeadline, g.newsSource, g.newsAge, g.newsUrl,
      ].map(escape).join(',');
    }),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const ts   = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  a.href     = url;
  a.download = `gappers_${tabLabel}_${ts}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  preMarket:    GapperResult[];
  intraday:     GapperResult[];
  onRefresh:    () => void;
  isRefreshing: boolean;
  lastRefreshed: Date | null;
};

type SubTab = 'pre-market' | 'intraday';

const AUTO_REFRESH_COOLDOWN = 45;

export function GappersWatchlist({ preMarket, intraday, onRefresh, isRefreshing, lastRefreshed }: Props) {
  const [subTab,    setSubTab]   = useState<SubTab>('pre-market');
  const [expanded,  setExpanded] = useState<Set<string>>(new Set());
  const [session,   setSession]  = useState<Session>(getMarketSession());
  const [countdown, setCountdown] = useState(AUTO_REFRESH_COOLDOWN);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);

  useEffect(() => {
    const id = setInterval(() => setSession(getMarketSession()), 30_000);
    return () => clearInterval(id);
  }, []);

  const clearTimers = useCallback(() => {
    if (cooldownRef.current) { clearInterval(cooldownRef.current);  cooldownRef.current = null; }
    if (refreshRef.current)  { clearTimeout(refreshRef.current);    refreshRef.current  = null; }
  }, []);

  useEffect(() => {
    if (subTab !== 'intraday' || isRefreshing || !lastRefreshed) {
      clearTimers();
      return;
    }
    setCountdown(AUTO_REFRESH_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1_000);
    refreshRef.current = setTimeout(() => {
      clearTimers();
      onRefresh();
    }, AUTO_REFRESH_COOLDOWN * 1_000);
    return clearTimers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefreshing, subTab, lastRefreshed]);

  useEffect(() => {
    if (subTab !== 'intraday') clearTimers();
  }, [subTab, clearTimers]);

  const rows = subTab === 'pre-market' ? preMarket : intraday;

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const isPreMarketSession = session.label === 'Pre-Market';
  const isLiveSession      = session.label === 'Market Open' || session.label === 'After Hours';

  return (
    <div>
      {/* ── Market session banner ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-800 px-3 py-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${session.dot} ${session.active ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-semibold ${session.color}`}>{session.label}</span>
          <span className="text-[10px] text-gray-600">US/Eastern</span>
        </div>
        {isPreMarketSession && (
          <span className="text-[11px] text-amber-400/80 bg-amber-900/20 border border-amber-800/30 rounded-md px-2 py-1">
            Pre-market active — run the scan now to capture gap data before the 9:30 AM open
          </span>
        )}
        {session.label === 'Market Closed' && (
          <span className="text-[11px] text-gray-500 bg-gray-900 border border-gray-800 rounded-md px-2 py-1">
            Market closed — pre-market opens at 4:00 AM ET
          </span>
        )}
      </div>

      {/* ── Sub-tab switcher + CSV export ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 p-1 bg-gray-900 rounded-xl border border-gray-800 w-fit">
          <SubTabBtn active={subTab === 'pre-market'} onClick={() => setSubTab('pre-market')}>
            🌅 Pre-Market Gappers
            <CountBadge n={preMarket.length} />
          </SubTabBtn>
          <SubTabBtn active={subTab === 'intraday'} onClick={() => setSubTab('intraday')}>
            <span className="flex items-center gap-1.5">
              {isLiveSession && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              Intraday Gappers (LIVE)
            </span>
            <CountBadge n={intraday.length} />
          </SubTabBtn>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {subTab === 'intraday' && !isRefreshing && lastRefreshed && (
            <span className="text-[11px] text-gray-500">
              Next refresh in <span className="text-gray-300 font-mono">{countdown}s</span>
            </span>
          )}
          {subTab === 'intraday' && isRefreshing && (
            <span className="flex items-center gap-1.5 text-[11px] text-blue-400">
              <Spinner sm /> Refreshing…
            </span>
          )}
          {/* CSV Export */}
          {rows.length > 0 && (
            <button
              onClick={() => exportCsv(rows, subTab)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition"
              title="Download current results as CSV"
            >
              <DownloadIcon />
              Export CSV
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 transition"
          >
            <RefreshIcon spinning={isRefreshing} />
            {subTab === 'pre-market' ? 'Refresh' : 'Refresh Now'}
          </button>
        </div>
      </div>

      {/* ── Pre-market context note ── */}
      {subTab === 'pre-market' && (
        <div className="rounded-lg bg-amber-950/20 border border-amber-800/30 px-4 py-2.5 mb-4 text-[11px] text-amber-300/80 leading-relaxed">
          {isPreMarketSession ? (
            <><strong className="text-amber-300">Pre-Market active (4:00 AM – 9:30 AM ET).</strong>
            {' '}Gap % is measured from the previous session close to the stock&apos;s current pre-market price.</>
          ) : (
            <><strong className="text-amber-300">Gap at Open.</strong>
            {' '}Pre-market prices clear when the market opens at 9:30 AM ET. This tab shows stocks that <em>opened with a gap</em> vs the previous close.</>
          )}
        </div>
      )}

      {/* ── Intraday context note ── */}
      {subTab === 'intraday' && (
        <div className="rounded-lg bg-blue-950/20 border border-blue-800/30 px-4 py-2.5 mb-4 text-[11px] text-blue-300/80 leading-relaxed">
          <strong className="text-blue-300">Live Intraday — auto-refreshes every ~{AUTO_REFRESH_COOLDOWN}s.</strong>
          {' '}Gap % is measured from the previous session close to the current traded price.
        </div>
      )}

      {/* ── Table or empty state ── */}
      {rows.length === 0 && !isRefreshing ? (
        <div className="rounded-xl border border-dashed border-gray-800 p-12 text-center text-gray-600">
          <p className="text-sm">No {subTab === 'pre-market' ? 'pre-market' : 'intraday'} gappers matching all criteria.</p>
          <p className="text-xs mt-1 text-gray-700">
            Filters: ≥ 2% gap · ≥ 50K shares traded · avg vol &gt; 300K · ATR ≥ $0.50 · short interest ≤ 30%
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm border-collapse min-w-[1380px]">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-3 py-3 text-left">Symbol</th>
                <th className="px-3 py-3 text-right">Price</th>
                <th className="px-3 py-3 text-right">Gap %</th>
                <th className="px-3 py-3 text-right">Vol Today</th>
                <th className="px-3 py-3 text-right">Market Cap</th>
                <th className="px-3 py-3 text-right">Float</th>
                <th className="px-3 py-3 text-right">ATR</th>
                <th className="px-3 py-3 text-right">Short %</th>
                <th className="px-3 py-3 text-center">Support / Resist</th>
                <th className="px-3 py-3 text-left">Sector</th>
                <th className="px-3 py-3 text-left">Catalyst</th>
                <th className="px-3 py-3 text-left">Strategy</th>
                <th className="px-3 py-3 text-center">Risk</th>
                <th className="px-3 py-3 w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((g, i) => {
                const key    = `${g.symbol}-${subTab}`;
                const isOpen = expanded.has(key);
                const isUp   = g.gapDirection === 'up';
                const rowBg  = i % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/40';
                const capCat = g.marketCap > 0 ? marketCapCategory(g.marketCap) : null;
                const fltCat = floatCategory(g.floatSharesM);

                return (
                  <>
                    <tr
                      key={key}
                      onClick={() => toggle(key)}
                      className={`${rowBg} border-b border-gray-800/50 hover:bg-gray-800/40 cursor-pointer transition-colors`}
                    >
                      {/* Symbol */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/stock/${g.symbol}`}
                            onClick={e => e.stopPropagation()}
                            className="font-bold text-white hover:text-blue-400 transition-colors"
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
                      <td className={`px-3 py-2.5 text-right font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isUp ? '+' : ''}{g.gapPct.toFixed(2)}%
                      </td>

                      {/* Vol Today */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="text-gray-200 font-mono">{fmtVol(g.volumeToday)}</div>
                        <div className="text-[10px] text-gray-500">{g.volRatio.toFixed(2)}× avg</div>
                      </td>

                      {/* Market Cap */}
                      <td className="px-3 py-2.5 text-right">
                        {g.marketCap > 0 ? (
                          <>
                            <div className="text-gray-200 font-mono text-xs">{fmtCap(g.marketCap)}</div>
                            {capCat && <div className={`text-[10px] font-semibold ${capCat.color}`}>{capCat.label}</div>}
                          </>
                        ) : <span className="text-gray-600">—</span>}
                      </td>

                      {/* Float */}
                      <td className="px-3 py-2.5 text-right">
                        {g.floatSharesM != null ? (
                          <>
                            <div className="text-gray-200 font-mono text-xs">{g.floatSharesM.toFixed(1)}M</div>
                            {fltCat && <div className={`text-[10px] font-semibold ${fltCat.color}`}>{fltCat.label}</div>}
                          </>
                        ) : <span className="text-gray-600">—</span>}
                      </td>

                      {/* ATR */}
                      <td className="px-3 py-2.5 text-right font-mono text-gray-300 text-xs">
                        ${g.atr.toFixed(2)}
                      </td>

                      {/* Short % */}
                      <td className="px-3 py-2.5 text-right">
                        {g.shortInterestPct != null ? (
                          <span className={g.shortInterestPct > 15 ? 'text-orange-400 font-semibold' : 'text-gray-300'}>
                            {g.shortInterestPct.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>

                      {/* S / R */}
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[10px] text-emerald-500 block">R ${g.resistance.toFixed(2)}</span>
                        <span className="text-[10px] text-red-500   block">S ${g.support.toFixed(2)}</span>
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

                      {/* Chevron */}
                      <td className="px-3 py-2.5 text-center text-gray-600 text-xs select-none">
                        {isOpen ? '▲' : '▼'}
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {isOpen && (
                      <tr key={`${key}-detail`} className={`${rowBg} border-b border-gray-700`}>
                        <td colSpan={14} className="px-4 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Strategy note */}
                            <div className="rounded-lg bg-gray-900 border border-gray-700 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-gray-300">Suggested Strategy</span>
                                <StrategyBadge strategy={g.suggestedStrategy} />
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">{g.strategyNote}</p>
                              <div className="grid grid-cols-3 gap-2 mt-3">
                                <MiniStat label="Prev Close"  value={`$${g.prevClose.toFixed(2)}`} />
                                <MiniStat label="ATR (14d)"   value={`$${g.atr.toFixed(2)}`} />
                                <MiniStat label="Avg Vol"     value={fmtVol(g.avgDailyVolume)} />
                                <MiniStat label="Support"     value={`$${g.support.toFixed(2)}`}    color="text-red-400" />
                                <MiniStat label="Resistance"  value={`$${g.resistance.toFixed(2)}`} color="text-emerald-400" />
                                <MiniStat label="Vol Ratio"   value={`${g.volRatio.toFixed(2)}×`}   color={g.volRatio > 1.5 ? 'text-amber-400' : 'text-gray-300'} />
                              </div>
                            </div>

                            {/* Fundamental catalyst + stock profile */}
                            <div className="rounded-lg bg-gray-900 border border-gray-700 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-gray-300">Fundamental Catalyst</span>
                                <CatalystBadge type={g.catalystType} />
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">{g.fundamentalCatalyst}</p>

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

                              {/* Stock profile stats */}
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                {g.marketCap > 0 && capCat && (
                                  <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Market Cap</p>
                                    <p className="text-sm font-semibold text-gray-200">{fmtCap(g.marketCap)}</p>
                                    <p className={`text-[10px] font-semibold ${capCat.color}`}>{capCat.label}</p>
                                  </div>
                                )}
                                {g.floatSharesM != null && fltCat && (
                                  <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Float</p>
                                    <p className="text-sm font-semibold text-gray-200">{g.floatSharesM.toFixed(1)}M shares</p>
                                    <p className={`text-[10px] font-semibold ${fltCat.color}`}>{fltCat.label}</p>
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
                                       g.shortInterestPct > 15 ? 'Elevated — watch for covering' : 'Normal range'}
                                    </p>
                                  </div>
                                )}
                              </div>
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
        Data from Yahoo Finance · Educational purposes only · Not financial advice ·
        Pre-market gaps: prev close → pre-market price · Intraday gaps: prev close → current price
      </p>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SubTabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 ${
        active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

function CountBadge({ n }: { n: number }) {
  return (
    <span className="ml-1 text-[10px] rounded-full px-1.5 py-0.5 bg-gray-700 text-gray-400">
      {n}
    </span>
  );
}

function Spinner({ sm }: { sm?: boolean }) {
  const sz = sm ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <svg className={`${sz} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CatalystBadge({ type }: { type: CatalystType }) {
  const colors: Record<string, string> = {
    'Earnings Beat':          'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'Earnings Miss':          'bg-red-500/20 text-red-300 border-red-500/40',
    'Earnings Report':        'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'FDA Approval':           'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'FDA Rejection':          'bg-red-500/20 text-red-300 border-red-500/40',
    'FDA Catalyst':           'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'M&A / Acquisition':      'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'Partnership / Alliance': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    'Major Contract':         'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    'Analyst Upgrade':        'bg-emerald-900/30 text-emerald-400 border-emerald-700/40',
    'Analyst Downgrade':      'bg-red-900/30 text-red-400 border-red-700/40',
    'Price Target Raise':     'bg-emerald-900/20 text-emerald-500 border-emerald-800/40',
    'Stock Split':            'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    'Share Buyback':          'bg-violet-500/20 text-violet-300 border-violet-500/40',
    'Debt Offering':          'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'Restructuring / Layoffs':'bg-amber-900/30 text-amber-400 border-amber-700/40',
    'Management Change':      'bg-slate-500/20 text-slate-300 border-slate-500/40',
    'Product Launch':         'bg-sky-500/20 text-sky-300 border-sky-500/40',
    'Short Squeeze Setup':    'bg-orange-500/20 text-orange-300 border-orange-500/40',
    'Unknown / Sector Move':  'bg-gray-800 text-gray-400 border-gray-700/40',
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

import type React from 'react';
