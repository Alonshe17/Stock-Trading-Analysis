'use client';

import { useState } from 'react';
import { ScannerResults } from '@/components/trading/ScannerResults';
import type { ScanResult } from '@/lib/intraday';

export default function ScannerPage() {
  const [results, setResults] = useState<ScanResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannedAt, setScannedAt] = useState<Date | null>(null);

  async function runScan() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/scanner/run');
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data);
      setScannedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed — try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Stock Pick Scanner</h1>
          <p className="text-gray-400 text-sm">
            Scans US large-cap stocks for midday momentum — best used around 11 AM EST.
            Filters for price &gt; $1, market cap &gt; $1B, volume &gt; 500K, then ranks by EMA 8 / EMA 200 relationship and volume pace.
          </p>
        </div>

        {/* Criteria cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <CriteriaCard label="Price" value="> $1.00" color="text-blue-400" />
          <CriteriaCard label="Market Cap" value="> $1B" color="text-blue-400" />
          <CriteriaCard label="Volume" value="> 500K" color="text-blue-400" />
          <CriteriaCard label="Universe" value="~200 large-caps" color="text-blue-400" />
        </div>

        {/* EMA legend */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 mb-6 text-sm">
          <p className="text-gray-400 font-medium mb-2">EMA Status Ranking (best → worst)</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <StatusChip label="EMA8 Cross ↑" color="text-emerald-400 border-emerald-400/30 bg-emerald-400/10" note="EMA8 just crossed above EMA200 — fresh signal" />
            <StatusChip label="Above Both" color="text-blue-400 border-blue-400/30 bg-blue-400/10" note="Price > EMA8 > EMA200 — strong uptrend" />
            <StatusChip label="Between EMAs" color="text-amber-400 border-amber-400/30 bg-amber-400/10" note="EMA200 < Price < EMA8 — pullback in uptrend" />
            <StatusChip label="Below EMA8" color="text-orange-400 border-orange-400/30 bg-orange-400/10" note="Price < EMA8, EMA8 > EMA200" />
            <StatusChip label="Below Both" color="text-red-400 border-red-400/30 bg-red-400/10" note="Price < EMA8 < EMA200 — downtrend" />
          </div>
        </div>

        {/* Run button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={runScan}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-white transition"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Scanning (~60–90 seconds)…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                Run Scan
              </>
            )}
          </button>

          {scannedAt && !loading && (
            <span className="text-xs text-gray-500">
              Last scanned at {scannedAt.toLocaleTimeString()}
              {results && <span className="ml-2 text-gray-400">· {results.length} candidates</span>}
            </span>
          )}
        </div>

        {loading && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-8 text-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <svg className="h-8 w-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm">Scanning ~200 large-cap stocks for momentum signals…</p>
              <p className="text-xs text-gray-600">This takes 60–90 seconds. Fetching quotes, volumes, and EMA data.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400 mb-4">
            {error}
          </div>
        )}

        {results && !loading && <ScannerResults results={results} />}

        {!results && !loading && (
          <div className="rounded-xl border border-dashed border-gray-800 p-12 text-center text-gray-600">
            <svg className="h-10 w-10 mx-auto mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <p className="text-sm">Click <strong className="text-gray-400">Run Scan</strong> to find today&apos;s momentum candidates.</p>
            <p className="text-xs mt-1">Best used around 11 AM – 12 PM EST for midday momentum.</p>
          </div>
        )}

        <p className="mt-8 text-xs text-gray-600">
          Data from Yahoo Finance. Scan results are for educational purposes only and do not constitute financial advice.
          Volume pace is calculated relative to the expected percentage of daily volume at the time of scan.
        </p>
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
