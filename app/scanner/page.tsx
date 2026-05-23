'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ScannerResults } from '@/components/trading/ScannerResults';
import { VolumeScannerResults } from '@/components/trading/VolumeScannerResults';
import { PreBreakoutResults } from '@/components/trading/PreBreakoutResults';
import { TradingNav } from '@/components/trading/TradingNav';
import type { ScanResult } from '@/lib/intraday';
import type { VolumeScanResult } from '@/lib/volumeScanner';
import type { PreBreakoutResult } from '@/lib/preBreakout';

type Tab = 'momentum' | 'volume' | 'prebreakout';

export default function ScannerPage() {
  const [tab, setTab] = useState<Tab>('prebreakout');

  // ── Momentum scanner state ──
  const [momResults,   setMomResults]   = useState<ScanResult[] | null>(null);
  const [momLoading,   setMomLoading]   = useState(false);
  const [momError,     setMomError]     = useState('');
  const [momScannedAt, setMomScannedAt] = useState<Date | null>(null);

  // ── Volume scanner state ──
  const [volResults,   setVolResults]   = useState<VolumeScanResult[] | null>(null);
  const [volLoading,   setVolLoading]   = useState(false);
  const [volError,     setVolError]     = useState('');
  const [volScannedAt, setVolScannedAt] = useState<Date | null>(null);

  // ── Pre-Breakout scanner state ──
  const [pbResults,   setPbResults]   = useState<PreBreakoutResult[] | null>(null);
  const [pbLoading,   setPbLoading]   = useState(false);
  const [pbError,     setPbError]     = useState('');
  const [pbScannedAt, setPbScannedAt] = useState<Date | null>(null);

  async function runMomentumScan() {
    setMomLoading(true); setMomError('');
    try {
      const res = await fetch('/api/scanner/run');
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMomResults(data);
      setMomScannedAt(new Date());
    } catch (e) {
      setMomError(e instanceof Error ? e.message : 'Scan failed — try again');
    } finally {
      setMomLoading(false);
    }
  }

  async function runVolumeScan() {
    setVolLoading(true); setVolError('');
    try {
      const res = await fetch('/api/scanner/volume');
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setVolResults(data);
      setVolScannedAt(new Date());
    } catch (e) {
      setVolError(e instanceof Error ? e.message : 'Scan failed — try again');
    } finally {
      setVolLoading(false);
    }
  }

  async function runPreBreakoutScan() {
    setPbLoading(true); setPbError('');
    try {
      const res = await fetch('/api/scanner/prebreakout');
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPbResults(data);
      setPbScannedAt(new Date());
    } catch (e) {
      setPbError(e instanceof Error ? e.message : 'Scan failed — try again');
    } finally {
      setPbLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Stock Scanner</h1>
            <p className="text-gray-400 text-sm">
              Three scan modes: pre-breakout setup detection, institutional price-volume analysis, and intraday momentum.
            </p>
          </div>
          <TradingNav active="/scanner" />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-gray-900 rounded-xl border border-gray-800 mb-6 w-fit">
          <TabButton active={tab === 'prebreakout'} onClick={() => setTab('prebreakout')}>
            🚀 Pre-Breakout Setup
          </TabButton>
          <TabButton active={tab === 'volume'} onClick={() => setTab('volume')}>
            📊 Volume Analysis
          </TabButton>
          <TabButton active={tab === 'momentum'} onClick={() => setTab('momentum')}>
            ⚡ Momentum Scanner
          </TabButton>
        </div>

        {/* ── PRE-BREAKOUT TAB ── */}
        {tab === 'prebreakout' && (
          <>
            {/* Methodology explainer */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 mb-5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                How It Works — Catch Stocks Before The Big Move
              </p>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                Scans for stocks quietly accumulating institutional buying during a multi-week base — the exact setup seen in stocks like Micron and Sandisk before their big runs.
                Modeled after IBD Stage 2 analysis, Pocket Pivot entries, and institutional volume fingerprints.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <SignalLegend
                  icon="📐" title="Stage 2 Alignment"
                  desc="Price > 50dMA > 150dMA > 200dMA — the perfect uptrend template. Stage 2-early = price reclaimed 50dMA but MAs not yet fully stacked."
                  bullish="Stage 2 / Stage 2-Early" bearish="Stage 3 (topping) / Stage 4 (decline)"
                />
                <SignalLegend
                  icon="📦" title="Base Tightness"
                  desc="20-day price range (high-to-low/low). Tight bases signal low distribution — institutions quietly accumulating without tipping their hand."
                  bullish="Range < 8% (very tight)" bearish="Range > 15% (loose / choppy)"
                />
                <SignalLegend
                  icon="⚖️" title="Up/Down Volume"
                  desc="Sum of volume on up days vs down days over 20 sessions. Ratio ≥ 2× = heavy institutional buying. Best signal of quiet accumulation."
                  bullish="Ratio ≥ 2.0× (strong buying)" bearish="Ratio < 1.0× (distribution)"
                />
                <SignalLegend
                  icon="📡" title="Relative Strength"
                  desc="60-day return vs SPY. Stocks that outperform the market during a base are being supported — institutions holding / adding quietly."
                  bullish="≥ +10% vs SPY (outperforming)" bearish="Underperforming SPY"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <SignalLegend
                  icon="💧" title="Volume Dry-Up (VDU)"
                  desc="Last 5-day avg volume < 70% of 50-day avg. Low-volume pullbacks mean no panic selling — the stock is resting, not being dumped."
                  bullish="5d avg < 70% of 50d avg" bearish="Heavy volume on down days"
                />
                <SignalLegend
                  icon="🔥" title="Pocket Pivot"
                  desc="Today's volume exceeds the highest down-volume day in prior 10 bars (IBD/Dave Landry pattern). The key entry trigger — institutions stepping in."
                  bullish="Volume > max down-vol (10d)" bearish="No pocket pivot yet"
                />
                <SignalLegend
                  icon="📈" title="OBV Trend"
                  desc="14-day linear regression slope of On-Balance Volume. Rising OBV during a tight base confirms quiet institutional accumulation."
                  bullish="Rising OBV (positive slope)" bearish="Falling OBV"
                />
              </div>
            </div>

            {/* Grade reference */}
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { label: 'Grade A', range: 'Score 8–10', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', note: 'All signals aligned — highest conviction' },
                { label: 'Grade B', range: 'Score 6–7',  badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',    note: 'Strong setup — most signals present' },
                { label: 'Grade C', range: 'Score 4–5',  badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', note: 'Developing setup — watch list candidate' },
                { label: 'Grade D', range: 'Score 0–3',  badge: 'bg-gray-800 text-gray-400 border-gray-700/40',       note: 'Not yet ready — missing key signals' },
              ].map(s => (
                <span key={s.label} className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold ${s.badge}`}>
                  {s.label} <span className="opacity-60 font-normal">{s.range}</span>
                  <span className="opacity-40 font-normal ml-1">· {s.note}</span>
                </span>
              ))}
            </div>

            {/* Run button */}
            <div className="flex items-center gap-4 mb-5">
              <button
                onClick={runPreBreakoutScan}
                disabled={pbLoading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-white transition"
              >
                {pbLoading ? (
                  <><Spinner /> Scanning (~60–90 seconds)…</>
                ) : (
                  <><SearchIcon /> Run Pre-Breakout Scan</>
                )}
              </button>

              {pbScannedAt && !pbLoading && (
                <span className="text-xs text-gray-500">
                  Last scanned {pbScannedAt.toLocaleTimeString()}
                  {pbResults && <span className="ml-2 text-gray-400">· {pbResults.length} results</span>}
                </span>
              )}
            </div>

            {pbLoading && <ScanningState text="Analyzing 1-year price history for ~200 large-cap stocks…" note="Calculating Stage alignment, base tightness, up/down vol ratio, RS vs SPY, OBV trend, and pocket pivot signals." />}
            {pbError && <ErrorBanner msg={pbError} />}
            {pbResults && !pbLoading && <PreBreakoutResults results={pbResults} />}
            {!pbResults && !pbLoading && <EmptyState label="Run Pre-Breakout Scan" note="Finds stocks in quiet accumulation bases before institutional breakouts." />}
          </>
        )}

        {/* ── VOLUME ANALYSIS TAB ── */}
        {tab === 'volume' && (
          <>
            {/* Signal legend */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 mb-5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                5 Institutional Price-Volume Signals
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <SignalLegend
                  icon="📊" title="Volume Surge"
                  desc="Volume vs 20-day average. Surge + up day = accumulation. Surge + down day = distribution."
                  bullish=">1.5× on up day" bearish=">1.5× on down day"
                />
                <SignalLegend
                  icon="📈" title="OBV Trend"
                  desc="On-Balance Volume 14-day slope. Rising OBV = institutions buying quietly."
                  bullish="Rising / Strong ↑" bearish="Falling / Strong ↓"
                />
                <SignalLegend
                  icon="📍" title="VWAP Proxy"
                  desc="20-day volume-weighted typical price. Price above = strength; below = weakness."
                  bullish="Price above VWAP" bearish="Price below VWAP"
                />
                <SignalLegend
                  icon="🔻" title="Short Interest"
                  desc="Short % of float vs prior month. Declining short = covering (bullish); rising = bearish."
                  bullish="Declining short %" bearish="Rising short %"
                />
                <SignalLegend
                  icon="🏔️" title="52-Week High"
                  desc="Distance from annual high. Institutions often buy near breakout zones."
                  bullish="Within 5% of high" bearish="Far from high"
                />
              </div>
            </div>

            {/* Score reference */}
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { label: 'Strong Accumulation', range: '+6 to +9', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                { label: 'Accumulation',         range: '+3 to +5', badge: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' },
                { label: 'Neutral',              range: '−1 to +2', badge: 'bg-gray-800 text-gray-400 border-gray-700/40' },
                { label: 'Distribution',         range: '−2 to −4', badge: 'bg-red-900/30 text-red-400 border-red-700/40' },
                { label: 'Strong Distribution',  range: '−5 to −7', badge: 'bg-red-500/20 text-red-300 border-red-500/40' },
              ].map(s => (
                <span key={s.label} className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold ${s.badge}`}>
                  {s.label} <span className="opacity-60 font-normal">{s.range}</span>
                </span>
              ))}
            </div>

            {/* Run button */}
            <div className="flex items-center gap-4 mb-5">
              <button
                onClick={runVolumeScan}
                disabled={volLoading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-white transition"
              >
                {volLoading ? (
                  <>
                    <Spinner />
                    Scanning (~60–90 seconds)…
                  </>
                ) : (
                  <>
                    <SearchIcon />
                    Run Volume Scan
                  </>
                )}
              </button>

              {volScannedAt && !volLoading && (
                <span className="text-xs text-gray-500">
                  Last scanned {volScannedAt.toLocaleTimeString()}
                  {volResults && <span className="ml-2 text-gray-400">· {volResults.length} results</span>}
                </span>
              )}
            </div>

            {volLoading && <ScanningState text="Fetching price-volume data for ~200 large-cap stocks…" note="Calculates OBV trend, VWAP proxy, volume ratios, short interest, and 52-week proximity." />}
            {volError && <ErrorBanner msg={volError} />}
            {volResults && !volLoading && <VolumeScannerResults results={volResults} />}
            {!volResults && !volLoading && <EmptyState label="Run Volume Scan" note="Scans ~200 large-cap stocks for institutional buying/selling pressure." />}
          </>
        )}

        {/* ── MOMENTUM TAB ── */}
        {tab === 'momentum' && (
          <>
            <p className="text-gray-400 text-sm mb-5">
              Scans US large-cap stocks for midday momentum — best used around 11 AM EST.
              Filters for price &gt; $1, market cap &gt; $1B, volume &gt; 500K, then ranks by EMA 8 / EMA 200 relationship.
            </p>

            {/* Criteria cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <CriteriaCard label="Price"      value="> $1.00"         color="text-blue-400" />
              <CriteriaCard label="Market Cap" value="> $1B"           color="text-blue-400" />
              <CriteriaCard label="Volume"     value="> 500K"          color="text-blue-400" />
              <CriteriaCard label="Universe"   value="~200 large-caps" color="text-blue-400" />
            </div>

            {/* EMA legend */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 mb-6 text-sm">
              <p className="text-gray-400 font-medium mb-2">EMA Status Ranking (best → worst)</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <StatusChip label="EMA8 Cross ↑"  color="text-emerald-400 border-emerald-400/30 bg-emerald-400/10" note="EMA8 just crossed above EMA200 — fresh signal" />
                <StatusChip label="Above Both"    color="text-blue-400 border-blue-400/30 bg-blue-400/10"     note="Price > EMA8 > EMA200 — strong uptrend" />
                <StatusChip label="Between EMAs"  color="text-amber-400 border-amber-400/30 bg-amber-400/10"  note="EMA200 < Price < EMA8 — pullback in uptrend" />
                <StatusChip label="Below EMA8"    color="text-orange-400 border-orange-400/30 bg-orange-400/10" note="Price < EMA8, EMA8 > EMA200" />
                <StatusChip label="Below Both"    color="text-red-400 border-red-400/30 bg-red-400/10"       note="Price < EMA8 < EMA200 — downtrend" />
              </div>
            </div>

            {/* Run button */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={runMomentumScan}
                disabled={momLoading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-white transition"
              >
                {momLoading ? (
                  <><Spinner /> Scanning (~60–90 seconds)…</>
                ) : (
                  <><SearchIcon /> Run Scan</>
                )}
              </button>

              {momScannedAt && !momLoading && (
                <span className="text-xs text-gray-500">
                  Last scanned at {momScannedAt.toLocaleTimeString()}
                  {momResults && <span className="ml-2 text-gray-400">· {momResults.length} candidates</span>}
                </span>
              )}
            </div>

            {momLoading && <ScanningState text="Scanning ~200 large-cap stocks for momentum signals…" note="This takes 60–90 seconds. Fetching quotes, volumes, and EMA data." />}
            {momError && <ErrorBanner msg={momError} />}
            {momResults && !momLoading && <ScannerResults results={momResults} />}
            {!momResults && !momLoading && <EmptyState label="Run Scan" note="Best used around 11 AM – 12 PM EST for midday momentum." />}

            <p className="mt-8 text-xs text-gray-600">
              Data from Yahoo Finance. Scan results are for educational purposes only and do not constitute financial advice.
              Volume pace is calculated relative to the expected percentage of daily volume at the time of scan.
            </p>
          </>
        )}

      </div>
    </div>
  );
}

// ── Small helper components ────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

function SignalLegend({ icon, title, desc, bullish, bearish }: {
  icon: string; title: string; desc: string; bullish: string; bearish: string;
}) {
  return (
    <div className="rounded-lg bg-gray-900 border border-gray-800 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-bold text-gray-300">{title}</span>
      </div>
      <p className="text-[10px] text-gray-500 leading-relaxed mb-2">{desc}</p>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-emerald-500">✓ {bullish}</span>
        <span className="text-[10px] text-red-500">✗ {bearish}</span>
      </div>
    </div>
  );
}

function CriteriaCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function StatusChip({ label, color, note }: { label: string; color: string; note: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-0.5 rounded border font-medium ${color}`}>{label}</span>
      <span className="text-gray-600">{note}</span>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  );
}

function ScanningState({ text, note }: { text: string; note: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-8 text-center mb-4">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <svg className="h-8 w-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm">{text}</p>
        <p className="text-xs text-gray-600">{note}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400 mb-4">
      {msg}
    </div>
  );
}

function EmptyState({ label, note }: { label: string; note: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-800 p-12 text-center text-gray-600">
      <svg className="h-10 w-10 mx-auto mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <p className="text-sm">Click <strong className="text-gray-400">{label}</strong> to start.</p>
      <p className="text-xs mt-1">{note}</p>
    </div>
  );
}

// Add missing import for React types
import type React from 'react';
