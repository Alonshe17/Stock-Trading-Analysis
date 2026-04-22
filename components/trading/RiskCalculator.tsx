'use client';

import { useState } from 'react';

export function RiskCalculator({ atr, price }: { atr: number; price: number }) {
  const [portfolio, setPortfolio] = useState('10000');
  const [riskPct, setRiskPct] = useState('2');
  const [stopPct, setStopPct] = useState('');

  const portfolioNum = parseFloat(portfolio) || 0;
  const riskPctNum = parseFloat(riskPct) || 2;
  // Default stop = 1.5× ATR below current price
  const defaultStopPct = price > 0 ? ((atr * 1.5) / price) * 100 : 2;
  const stopPctNum = parseFloat(stopPct) || defaultStopPct;

  const dollarRisk = portfolioNum * (riskPctNum / 100);
  const stopPerShare = price * (stopPctNum / 100);
  const shares = stopPerShare > 0 ? Math.floor(dollarRisk / stopPerShare) : 0;
  const positionValue = shares * price;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Risk Calculator</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Field label="Portfolio ($)" value={portfolio} onChange={setPortfolio} placeholder="10000" />
        <Field label="Risk per trade (%)" value={riskPct} onChange={setRiskPct} placeholder="2" />
        <Field label="Stop distance (%)" value={stopPct} onChange={setStopPct} placeholder={defaultStopPct.toFixed(1)} />
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Result label="Dollar Risk" value={`$${dollarRisk.toFixed(0)}`} />
        <Result label="Shares to Buy" value={shares.toString()} />
        <Result label="Position Value" value={`$${positionValue.toFixed(0)}`} />
      </div>
      <p className="text-xs text-gray-600 mt-3">
        Default stop = 1.5× ATR (${(atr * 1.5).toFixed(2)} below entry). Edit stop % to customize.
      </p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-gray-800/60 px-3 py-2">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
