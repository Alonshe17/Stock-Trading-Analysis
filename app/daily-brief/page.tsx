'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TradingNav } from '@/components/trading/TradingNav';
import { WatchlistStar } from '@/components/trading/WatchlistStar';

// ── Types ─────────────────────────────────────────────────────────────────────

type Mover = {
  symbol: string; name: string; price: number;
  change: number; changePct: number;
  volume: number; avgVolume: number; marketCapM: number;
};

type Holding = {
  rank: number; name: string; cusip: string;
  valueK: number; shares: number; pctPortfolio: number;
};

type HoldingsData = {
  investor: string; cik: string;
  filedAt: string; period: string;
  totalValueM: number; holdings: Holding[];
};

type MoversTab = 'gainers' | 'losers' | 'actives' | 'trending';

// ── Investors list ────────────────────────────────────────────────────────────

const INVESTORS = [
  { key: 'berkshire',    label: 'Warren Buffett',       sub: 'Berkshire Hathaway',      cik: '0001067983', emoji: '🧙' },
  { key: 'pershing',     label: 'Bill Ackman',           sub: 'Pershing Square Capital', cik: '0001336528', emoji: '🏛️' },
  { key: 'scion',        label: 'Michael Burry',         sub: 'Scion Asset Management',  cik: '0001418827', emoji: '🐻' },
  { key: 'bridgewater',  label: 'Ray Dalio',             sub: 'Bridgewater Associates',  cik: '0001350694', emoji: '🌊' },
  { key: 'citadel',      label: 'Ken Griffin',           sub: 'Citadel Advisors',        cik: '0001423298', emoji: '🦅' },
  { key: 'soros',        label: 'George Soros',          sub: 'Soros Fund Management',   cik: '0001029160', emoji: '💰' },
  { key: 'duquesne',     label: 'S. Druckenmiller',      sub: 'Duquesne Family Office',  cik: '0001536411', emoji: '🎯' },
  { key: 'greenlight',   label: 'David Einhorn',         sub: 'Greenlight Capital',      cik: '0001079114', emoji: '💡' },
  { key: 'trump',        label: 'Donald Trump',          sub: 'Presidential Disclosures',cik: 'TRUMP',      emoji: '🏛️' },
];

// ── Module-level cache (survives client-side navigation) ──────────────────────

const _cache: {
  moversTab:        MoversTab;
  movers:           Partial<Record<MoversTab, Mover[]>>;
  selectedInvestor: string | null;
  holdings:         Record<string, HoldingsData | 'error'>;
} = {
  moversTab:        'gainers',
  movers:           {},
  selectedInvestor: null,
  holdings:         {},
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DailyBriefPage() {
  const [moversTab,       setMoversTabState]       = useState<MoversTab>(_cache.moversTab);
  const [moversData,      setMoversDataState]      = useState<Partial<Record<MoversTab, Mover[]>>>({ ..._cache.movers });
  const [moversLoading,   setMoversLoading]        = useState(false);
  const [moversError,     setMoversError]          = useState('');
  const [selectedInv,     setSelectedInvState]     = useState<string | null>(_cache.selectedInvestor);
  const [holdingsData,    setHoldingsDataState]    = useState<Record<string, HoldingsData | 'error'>>({ ..._cache.holdings });
  const [holdingsLoading, setHoldingsLoading]      = useState(false);

  // Wrapper setters sync both React state and module cache
  const setMoversTab = (t: MoversTab) => { _cache.moversTab = t; setMoversTabState(t); };
  const setSelectedInv = (k: string | null) => { _cache.selectedInvestor = k; setSelectedInvState(k); };

  function storeMovers(tab: MoversTab, data: Mover[]) {
    _cache.movers[tab] = data;
    setMoversDataState(prev => ({ ...prev, [tab]: data }));
  }
  function storeHoldings(key: string, data: HoldingsData | 'error') {
    _cache.holdings[key] = data;
    setHoldingsDataState(prev => ({ ...prev, [key]: data }));
  }

  // Auto-load gainers on mount
  useEffect(() => {
    if (!_cache.movers.gainers) {
      void (async () => {
        setMoversLoading(true);
        setMoversError('');
        try {
          const res  = await fetch('/api/market/movers?type=gainers');
          const data = await res.json();
          if (!res.ok || data?.error) throw new Error(data?.error ?? 'Failed');
          storeMovers('gainers', data);
        } catch (e) {
          setMoversError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
          setMoversLoading(false);
        }
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMovers(tab: MoversTab) {
    if (_cache.movers[tab]) {
      setMoversDataState({ ..._cache.movers });
      return;
    }
    setMoversLoading(true);
    setMoversError('');
    try {
      const res  = await fetch(`/api/market/movers?type=${tab}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error ?? 'Failed');
      storeMovers(tab, data);
    } catch (e) {
      setMoversError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setMoversLoading(false);
    }
  }

  function handleMoversTab(tab: MoversTab) {
    setMoversTab(tab);
    loadMovers(tab);
  }

  async function loadHoldings(invKey: string, cik: string) {
    if (_cache.holdings[invKey]) { setSelectedInv(invKey); return; }
    setSelectedInv(invKey);
    setHoldingsLoading(true);
    try {
      const res  = await fetch(`/api/market/holdings?cik=${encodeURIComponent(cik)}&investor=${encodeURIComponent(invKey)}`);
      const data = await res.json();
      storeHoldings(invKey, (!res.ok || data?.error) ? 'error' : data);
    } catch {
      storeHoldings(invKey, 'error');
    } finally {
      setHoldingsLoading(false);
    }
  }

  function handleInvestorClick(inv: typeof INVESTORS[0]) {
    if (inv.cik === 'TRUMP') { setSelectedInv(inv.key); return; }
    loadHoldings(inv.key, inv.cik);
  }

  const currentMovers   = moversData[moversTab] ?? null;
  const currentHoldings = selectedInv ? holdingsData[selectedInv] ?? null : null;
  const currentInv      = INVESTORS.find(i => i.key === selectedInv) ?? null;

  const MOVER_TABS: [MoversTab, string, string][] = [
    ['gainers',  '🚀 Top Gainers',  'Biggest % gainers today'],
    ['losers',   '📉 Top Losers',   'Biggest % losers today'],
    ['actives',  '🔥 Most Active',  'Highest trading volume'],
    ['trending', '📊 Trending',     'Trending tickers right now'],
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Daily Market Brief</h1>
            <p className="text-gray-400 text-sm">
              Top gainers, losers, stocks to watch today — plus institutional 13F holdings from top investors and fund managers.
            </p>
          </div>
          <TradingNav active="/daily-brief" />
        </div>

        {/* ════════════════════════════════════════════════════════════
            SECTION 1 — TODAY'S MARKET MOVERS
        ════════════════════════════════════════════════════════════ */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-white">Today&apos;s Market Movers</h2>
            <span className="text-[10px] text-gray-600 bg-gray-900 border border-gray-800 rounded px-2 py-0.5 uppercase tracking-wider">Live data</span>
          </div>

          {/* Tab switcher */}
          <div className="flex flex-wrap gap-1 p-1 bg-gray-900 rounded-xl border border-gray-800 mb-5 w-fit">
            {MOVER_TABS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleMoversTab(key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  moversTab === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Description */}
          <p className="text-xs text-gray-600 mb-4">
            {MOVER_TABS.find(([k]) => k === moversTab)?.[2]}
            {moversTab === 'trending' && ' · Updates throughout the day'}
            {moversTab === 'actives' && ' · Sorted by total share volume'}
          </p>

          {moversLoading && <LoadingSpinner text="Fetching market data from Yahoo Finance…" />}
          {moversError && !moversLoading && <ErrorCard msg={moversError} />}

          {currentMovers && !moversLoading && (
            <MoversTable movers={currentMovers} tab={moversTab} />
          )}

          {!currentMovers && !moversLoading && !moversError && (
            <div className="rounded-xl border border-dashed border-gray-800 p-12 text-center text-gray-600 text-sm">
              Loading…
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════════
            SECTION 2 — INSTITUTIONAL 13F HOLDINGS
        ════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-white">🏦 Institutional Holdings (SEC 13F)</h2>
          </div>
          <p className="text-gray-500 text-xs mb-5">
            Quarterly holdings from SEC Form 13F-HR filings, sourced directly from EDGAR.
            Filed within 45 days after each quarter end — data may be up to 3 months old.
            Select an investor below to load their latest disclosed portfolio.
          </p>

          {/* Investor selector grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 mb-6">
            {INVESTORS.map(inv => (
              <button
                key={inv.key}
                onClick={() => handleInvestorClick(inv)}
                className={`rounded-xl border p-3 text-left transition ${
                  selectedInv === inv.key
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-800 bg-gray-900/60 hover:border-gray-600 hover:bg-gray-900'
                }`}
              >
                <div className="text-xl mb-1">{inv.emoji}</div>
                <div className="text-[11px] font-bold text-white leading-tight">{inv.label}</div>
                <div className="text-[9px] text-gray-500 mt-0.5 leading-tight">{inv.sub}</div>
              </button>
            ))}
          </div>

          {/* Holdings display */}
          {!selectedInv && (
            <div className="rounded-xl border border-dashed border-gray-800 p-12 text-center text-gray-600">
              <p className="text-sm">Select an investor above to view their latest 13F holdings.</p>
              <p className="text-xs mt-1 text-gray-700">Data sourced directly from SEC EDGAR. Click any name above.</p>
            </div>
          )}

          {selectedInv && holdingsLoading && (
            <LoadingSpinner text="Fetching 13F filing from SEC EDGAR — this may take a few seconds…" />
          )}

          {selectedInv === 'trump' && !holdingsLoading && <TrumpCard />}

          {selectedInv && selectedInv !== 'trump' && !holdingsLoading && currentHoldings === 'error' && (
            <div className="rounded-xl border border-amber-900/50 bg-amber-950/10 p-5">
              <p className="text-sm font-semibold text-amber-400 mb-1">No 13F data available</p>
              <p className="text-xs text-amber-700">
                This investor may have converted to a family office (managing only personal assets) and no longer files
                Form 13F-HR with the SEC. Or their most recent filing is in an older EDGAR submissions page.
                Try searching <a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(currentInv?.sub ?? '')}&type=13F-HR&dateb=&owner=include&count=10`}
                  target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-400">EDGAR directly</a>.
              </p>
            </div>
          )}

          {selectedInv && selectedInv !== 'trump' && !holdingsLoading && currentHoldings && currentHoldings !== 'error' && currentInv && (
            <HoldingsTable data={currentHoldings} investor={currentInv} />
          )}
        </section>

        {/* Disclaimer */}
        <p className="mt-10 text-xs text-gray-700 leading-relaxed">
          Market data via Yahoo Finance. Institutional holdings from SEC EDGAR 13F-HR filings.
          13F data reflects holdings at quarter-end and may be up to 135 days old. Not financial advice.
        </p>
      </div>
    </div>
  );
}

// ── Movers table ──────────────────────────────────────────────────────────────

function MoversTable({ movers, tab }: { movers: Mover[]; tab: MoversTab }) {
  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/80">
            <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider w-8">#</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Company</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Change</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Volume</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Avg Vol</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Mkt Cap</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800 bg-gray-950">
          {movers.map((m, i) => {
            const up = m.changePct >= 0;
            const volRatio = m.avgVolume > 0 ? m.volume / m.avgVolume : 0;
            return (
              <tr key={m.symbol} className="hover:bg-gray-900/60 transition group">
                <td className="px-3 py-2 text-gray-600 text-center">{i + 1}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/stock/${m.symbol}`}
                      className="font-bold text-white hover:text-blue-400 transition"
                    >
                      {m.symbol}
                    </Link>
                    <WatchlistStar symbol={m.symbol} name={m.name} />
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-400 max-w-[160px] truncate">{m.name}</td>
                <td className="px-3 py-2 text-right font-semibold text-white">${m.price.toFixed(2)}</td>
                <td className={`px-3 py-2 text-right font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                  {up ? '+' : ''}{m.changePct.toFixed(2)}%
                  <span className="block text-[10px] opacity-60 font-normal">
                    {up ? '+' : ''}{m.change.toFixed(2)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-gray-400 hidden sm:table-cell">
                  {fmtVol(m.volume)}
                  {volRatio >= 2 && (
                    <span className="ml-1 text-amber-400 text-[9px] font-bold">{volRatio.toFixed(1)}×</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-600 hidden md:table-cell">{fmtVol(m.avgVolume)}</td>
                <td className="px-3 py-2 text-right text-gray-400 hidden lg:table-cell">{fmtCap(m.marketCapM)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {tab === 'trending' && (
        <div className="px-3 py-2 border-t border-gray-800 bg-gray-900/40 text-[10px] text-gray-600">
          Trending tickers are based on search activity on Yahoo Finance. Not a buy/sell recommendation.
        </div>
      )}
    </div>
  );
}

// ── Holdings table ────────────────────────────────────────────────────────────

function HoldingsTable({
  data,
  investor,
}: {
  data:     HoldingsData;
  investor: typeof INVESTORS[0];
}) {
  const portfolioStr = data.totalValueM >= 1_000
    ? `$${(data.totalValueM / 1_000).toFixed(1)}B`
    : `$${data.totalValueM.toFixed(0)}M`;

  return (
    <div>
      {/* Meta header */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xl">{investor.emoji}</span>
              <span className="font-bold text-white">{investor.label}</span>
              <span className="text-gray-500 text-sm">·</span>
              <span className="text-gray-400 text-sm">{investor.sub}</span>
            </div>
            <p className="text-[10px] text-gray-600">
              SEC Form 13F-HR · Showing top 25 holdings · Source: EDGAR
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div>
              <div className="text-gray-600 text-[10px] uppercase tracking-wider">Period</div>
              <div className="text-white font-semibold">{fmtPeriod(data.period)}</div>
            </div>
            <div>
              <div className="text-gray-600 text-[10px] uppercase tracking-wider">Filed</div>
              <div className="text-white font-semibold">{fmtDate(data.filedAt)}</div>
            </div>
            <div>
              <div className="text-gray-600 text-[10px] uppercase tracking-wider">Portfolio (shown)</div>
              <div className="text-emerald-400 font-bold">{portfolioStr}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/80">
              <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider w-8">#</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">CUSIP</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Shares</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">% Portfolio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-950">
            {data.holdings.map(h => (
              <tr key={h.cusip || h.name} className="hover:bg-gray-900/60 transition">
                <td className="px-3 py-2 text-gray-600 text-center">{h.rank}</td>
                <td className="px-3 py-2 text-white font-medium">{titleCase(h.name)}</td>
                <td className="px-3 py-2 text-gray-600 font-mono hidden sm:table-cell">{h.cusip}</td>
                <td className="px-3 py-2 text-right text-emerald-400 font-semibold">{fmtHolding(h.valueK)}</td>
                <td className="px-3 py-2 text-right text-gray-400 hidden md:table-cell">{fmtShares(h.shares)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 bg-gray-800 rounded-full w-14 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(h.pctPortfolio, 100)}%` }}
                      />
                    </div>
                    <span className="text-gray-300 w-10 text-right">{h.pctPortfolio.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-2 border-t border-gray-800 bg-gray-900/40 text-[10px] text-gray-600">
          Values in USD thousands. 13F reflects long positions in U.S. equities held at quarter end.
          Options, bonds, and international holdings are often excluded. Not financial advice.
        </div>
      </div>
    </div>
  );
}

// ── Trump disclosure card ─────────────────────────────────────────────────────

function TrumpCard() {
  return (
    <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">🏛️</span>
        <div>
          <h3 className="font-bold text-white text-sm mb-1">Donald Trump — Investment Disclosures</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            As a former/current officeholder, Trump&apos;s financial holdings are disclosed via the
            <strong className="text-gray-200"> OGE Form 278e (Presidential Financial Disclosure)</strong>,
            not SEC Form 13F. These are filed annually with the Office of Government Ethics and cover
            personal assets, business interests, and investment positions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Primary holding: DJT */}
        <div className="rounded-lg bg-gray-900/60 border border-gray-800 p-3">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Primary Public Holding
          </div>
          <Link
            href="/stock/DJT"
            className="flex items-center justify-between rounded p-1 -mx-1 hover:bg-gray-800/50 transition"
          >
            <div>
              <div className="font-bold text-blue-400 text-sm">DJT</div>
              <div className="text-xs text-gray-500">Trump Media &amp; Technology Group</div>
            </div>
            <span className="text-xs text-blue-400">View Analysis →</span>
          </Link>
          <p className="text-[10px] text-gray-600 mt-2">
            Trump owns ≈57% of TMTG (parent of Truth Social) per latest disclosure.
            This is his primary publicly traded equity position.
          </p>
        </div>

        {/* Other known positions */}
        <div className="rounded-lg bg-gray-900/60 border border-gray-800 p-3">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Other Known Interests
          </div>
          <ul className="text-xs text-gray-400 space-y-1.5">
            <li className="flex gap-2"><span className="text-gray-600">·</span> Trump Organization (private) — hotels, golf courses, real estate</li>
            <li className="flex gap-2"><span className="text-gray-600">·</span> Various real estate partnerships &amp; licensing deals</li>
            <li className="flex gap-2"><span className="text-gray-600">·</span> Trump NFT collections &amp; branded ventures</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <a
          href="https://efts.sec.gov/LATEST/search-index?q=%22Trump%22&forms=13F-HR&dateRange=custom&startdt=2020-01-01"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 transition"
        >
          Search SEC EDGAR for Trump filings →
        </a>
        <a
          href="https://disclosures.house.gov/search/#/financial"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 transition"
        >
          Financial Disclosure Portal →
        </a>
      </div>

      <div className="text-[10px] text-gray-600 border-t border-gray-800/50 pt-3">
        ⚠️ Presidential financial disclosure forms are less granular than 13F filings and may not list individual
        stock positions. For the most recent data, search the Office of Government Ethics (OGE) public database.
      </div>
    </div>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-8 text-center">
      <svg className="h-7 w-7 animate-spin text-blue-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

function ErrorCard({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
      {msg}
    </div>
  );
}

// ── Number formatters ─────────────────────────────────────────────────────────

function fmtVol(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function fmtCap(m: number): string {
  if (m >= 1_000_000) return `$${(m / 1_000_000).toFixed(1)}T`;
  if (m >= 1_000)     return `$${(m / 1_000).toFixed(0)}B`;
  return `$${m.toFixed(0)}M`;
}

function fmtHolding(k: number): string {
  // k is in thousands USD
  if (k >= 1_000_000_000) return `$${(k / 1_000_000_000).toFixed(1)}T`;
  if (k >= 1_000_000)     return `$${(k / 1_000_000).toFixed(1)}B`;
  if (k >= 1_000)         return `$${(k / 1_000).toFixed(1)}M`;
  return `$${k.toFixed(0)}K`;
}

function fmtShares(s: number): string {
  if (s >= 1_000_000_000) return `${(s / 1_000_000_000).toFixed(2)}B`;
  if (s >= 1_000_000)     return `${(s / 1_000_000).toFixed(1)}M`;
  if (s >= 1_000)         return `${(s / 1_000).toFixed(0)}K`;
  return String(s);
}

function fmtPeriod(period: string): string {
  if (!period) return '—';
  const [yr, mo] = period.split('-');
  const q: Record<string, string> = { '03': 'Q1', '06': 'Q2', '09': 'Q3', '12': 'Q4' };
  return `${q[mo] ?? mo} ${yr}`;
}

function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
