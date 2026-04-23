import type { Financials } from '@/lib/finnhub';

type Props = { financials: Financials; symbol: string };

function fmt(v: number | null, decimals = 1, suffix = ''): string {
  if (v === null || isNaN(v)) return '—';
  return `${v.toFixed(decimals)}${suffix}`;
}

function fmtM(v: number | null): string {
  if (v === null || isNaN(v)) return '—';
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}T`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}B`;
  return `$${v.toFixed(0)}M`;
}

function colorPct(v: number | null, goodHigh = true): string {
  if (v === null) return 'text-gray-400';
  if (goodHigh) return v >= 15 ? 'text-emerald-400' : v >= 5 ? 'text-amber-400' : 'text-red-400';
  return v <= 50 ? 'text-emerald-400' : v <= 100 ? 'text-amber-400' : 'text-red-400';
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-medium ${color ?? 'text-gray-200'}`}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

export function FundamentalsPanel({ financials: f, symbol }: Props) {
  const recColor =
    f.recommendation === 'Strong Buy' ? 'text-emerald-400' :
    f.recommendation === 'Buy' ? 'text-green-400' :
    f.recommendation === 'Hold' ? 'text-amber-400' :
    f.recommendation ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-gray-300">
        Fundamentals <span className="text-gray-600 font-normal text-sm">· {symbol}</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Valuation */}
        <Section title="Valuation">
          <Row label="P/E (TTM)"     value={fmt(f.peRatio)}     color={f.peRatio !== null ? (f.peRatio < 15 ? 'text-emerald-400' : f.peRatio < 30 ? 'text-amber-400' : 'text-red-400') : undefined} />
          <Row label="Forward P/E"   value={fmt(f.forwardPE)}   color={f.forwardPE !== null ? (f.forwardPE < 15 ? 'text-emerald-400' : f.forwardPE < 25 ? 'text-amber-400' : 'text-red-400') : undefined} />
          <Row label="Price/Book"    value={fmt(f.pbRatio)}     />
          <Row label="EPS (TTM)"     value={f.eps !== null ? `$${f.eps.toFixed(2)}` : '—'} color={f.eps !== null ? (f.eps > 0 ? 'text-emerald-400' : 'text-red-400') : undefined} />
          {f.dividendYield ? (
            <Row label="Div Yield" value={fmt(f.dividendYield, 2, '%')} color="text-blue-400" />
          ) : null}
        </Section>

        {/* Profitability */}
        <Section title="Profitability">
          <Row label="Revenue (TTM)"    value={fmtM(f.revenue)} />
          <Row label="Rev Growth (YoY)" value={fmt(f.revenueGrowth, 1, '%')} color={f.revenueGrowth !== null ? (f.revenueGrowth >= 10 ? 'text-emerald-400' : f.revenueGrowth >= 0 ? 'text-amber-400' : 'text-red-400') : undefined} />
          <Row label="Gross Margin"     value={fmt(f.grossMargin, 1, '%')}     color={colorPct(f.grossMargin)} />
          <Row label="Op. Margin"       value={fmt(f.operatingMargin, 1, '%')} color={colorPct(f.operatingMargin)} />
          <Row label="Net Margin"       value={fmt(f.profitMargin, 1, '%')}    color={colorPct(f.profitMargin)} />
          <Row label="ROE"              value={fmt(f.returnOnEquity, 1, '%')}  color={colorPct(f.returnOnEquity)} />
          <Row label="ROA"              value={fmt(f.returnOnAssets, 1, '%')}  color={colorPct(f.returnOnAssets)} />
        </Section>

        {/* Cash Flow */}
        <Section title="Cash Flow">
          <Row
            label="Operating CF"
            value={fmtM(f.operatingCashFlow)}
            color={f.operatingCashFlow !== null ? (f.operatingCashFlow > 0 ? 'text-emerald-400' : 'text-red-400') : undefined}
          />
          <Row
            label="Free Cash Flow"
            value={fmtM(f.freeCashFlow)}
            color={f.freeCashFlow !== null ? (f.freeCashFlow > 0 ? 'text-emerald-400' : 'text-red-400') : undefined}
          />
          <div className="mt-2 pt-2 border-t border-gray-800">
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="text-emerald-400 font-medium">Positive FCF</span> = company generates more cash than it spends. Enables buybacks, dividends, and debt paydown.
            </p>
          </div>
        </Section>

        {/* Balance Sheet + Analyst */}
        <Section title="Balance Sheet & Analyst">
          <Row label="Cash & Equiv."  value={fmtM(f.totalCash)} color="text-emerald-400" />
          <Row label="Total Debt"     value={fmtM(f.totalDebt)} color={f.totalDebt !== null ? (f.totalDebt < (f.totalCash ?? 0) ? 'text-emerald-400' : 'text-amber-400') : undefined} />
          <Row label="Debt/Equity"    value={fmt(f.debtToEquity, 1, '%')} color={colorPct(f.debtToEquity, false)} />

          {(f.targetPrice !== null || f.recommendation !== null) && (
            <div className="mt-2 pt-2 border-t border-gray-800 space-y-1.5">
              {f.targetPrice !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Analyst Target</span>
                  <span className="text-xs font-medium text-blue-400">${f.targetPrice.toFixed(2)}</span>
                </div>
              )}
              {f.recommendation !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Consensus {f.analystCount ? `(${f.analystCount})` : ''}
                  </span>
                  <span className={`text-xs font-semibold ${recColor}`}>{f.recommendation}</span>
                </div>
              )}
            </div>
          )}
        </Section>

      </div>

      <p className="text-xs text-gray-700">
        Financials sourced from Yahoo Finance · TTM = Trailing Twelve Months · Updated every hour
      </p>
    </div>
  );
}
