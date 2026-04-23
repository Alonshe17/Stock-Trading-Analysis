import type { Financials } from '@/lib/finnhub';

type Props = { financials: Financials; symbol: string };

function fmt(v: number | null, decimals = 1, suffix = ''): string {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return `${v.toFixed(decimals)}${suffix}`;
}

function colorMargin(v: number | null): string {
  if (v === null) return 'text-gray-400';
  return v >= 20 ? 'text-emerald-400' : v >= 8 ? 'text-amber-400' : 'text-red-400';
}

function colorGrowth(v: number | null): string {
  if (v === null) return 'text-gray-400';
  return v >= 10 ? 'text-emerald-400' : v >= 0 ? 'text-amber-400' : 'text-red-400';
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800/60 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-medium tabular-nums ${color ?? 'text-gray-200'}`}>{value}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <span>{icon}</span>{title}
      </h3>
      {children}
    </div>
  );
}

function AnalystBar({ buy, hold, sell }: { buy: number; hold: number; sell: number }) {
  const total = buy + hold + sell;
  if (total === 0) return <span className="text-xs text-gray-600">No data</span>;
  const bPct = (buy / total) * 100;
  const hPct = (hold / total) * 100;
  const sPct = (sell / total) * 100;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex rounded-full overflow-hidden h-2">
        <div style={{ width: `${bPct}%` }} className="bg-emerald-500" />
        <div style={{ width: `${hPct}%` }} className="bg-amber-500" />
        <div style={{ width: `${sPct}%` }} className="bg-red-500" />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span><span className="text-emerald-400 font-medium">{buy}</span> Buy</span>
        <span><span className="text-amber-400 font-medium">{hold}</span> Hold</span>
        <span><span className="text-red-400 font-medium">{sell}</span> Sell</span>
      </div>
    </div>
  );
}

export function FundamentalsPanel({ financials: f, symbol }: Props) {
  const recColor =
    f.recommendation === 'Strong Buy' ? 'text-emerald-400' :
    f.recommendation === 'Buy'        ? 'text-green-400' :
    f.recommendation === 'Hold'       ? 'text-amber-400' :
    f.recommendation                  ? 'text-red-400'   : 'text-gray-500';

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-gray-300">
        Fundamentals <span className="text-gray-600 font-normal text-sm">· {symbol} · via Finnhub</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

        {/* Valuation */}
        <Section title="Valuation" icon="💰">
          <Row label="P/E (TTM)"
            value={fmt(f.peTTM)}
            color={f.peTTM !== null ? (f.peTTM < 15 ? 'text-emerald-400' : f.peTTM < 30 ? 'text-amber-400' : 'text-red-400') : undefined}
          />
          <Row label="Price / FCF"
            value={fmt(f.pfcfTTM)}
            color={f.pfcfTTM !== null ? (f.pfcfTTM < 20 ? 'text-emerald-400' : f.pfcfTTM < 35 ? 'text-amber-400' : 'text-red-400') : undefined}
          />
          <Row label="EV / Revenue"  value={fmt(f.evRevenueTTM)} />
          <Row label="EPS (TTM)"
            value={f.eps !== null ? `$${f.eps.toFixed(2)}` : '—'}
            color={f.eps !== null ? (f.eps > 0 ? 'text-emerald-400' : 'text-red-400') : undefined}
          />
          <Row label="Cash Flow/Share" value={f.cashFlowPerShare !== null ? `$${f.cashFlowPerShare.toFixed(2)}` : '—'}
            color={f.cashFlowPerShare !== null ? (f.cashFlowPerShare > 0 ? 'text-emerald-400' : 'text-red-400') : undefined}
          />
          {f.dividendYield ? (
            <Row label="Div Yield" value={fmt(f.dividendYield, 2, '%')} color="text-blue-400" />
          ) : null}
        </Section>

        {/* Profitability */}
        <Section title="Profitability" icon="📈">
          <Row label="Gross Margin"    value={fmt(f.grossMargin, 1, '%')}    color={colorMargin(f.grossMargin)} />
          <Row label="Op. Margin"      value={fmt(f.operatingMargin, 1, '%')} color={colorMargin(f.operatingMargin)} />
          <Row label="Net Margin"      value={fmt(f.netMargin, 1, '%')}      color={colorMargin(f.netMargin)} />
          <Row label="ROE (TTM)"
            value={fmt(f.roeTTM, 1, '%')}
            color={f.roeTTM !== null ? (f.roeTTM >= 15 ? 'text-emerald-400' : f.roeTTM >= 8 ? 'text-amber-400' : 'text-red-400') : undefined}
          />
          <Row label="ROA (TTM)"
            value={fmt(f.roaTTM, 1, '%')}
            color={f.roaTTM !== null ? (f.roaTTM >= 8 ? 'text-emerald-400' : f.roaTTM >= 3 ? 'text-amber-400' : 'text-red-400') : undefined}
          />
        </Section>

        {/* Growth */}
        <Section title="Revenue Growth" icon="🚀">
          <Row label="YoY (TTM)"  value={fmt(f.revenueGrowthYoy, 1, '%')}  color={colorGrowth(f.revenueGrowthYoy)} />
          <Row label="3Y CAGR"    value={fmt(f.revenueGrowth3Y,  1, '%')}  color={colorGrowth(f.revenueGrowth3Y)} />
          <Row label="5Y CAGR"    value={fmt(f.revenueGrowth5Y,  1, '%')}  color={colorGrowth(f.revenueGrowth5Y)} />
          <Row label="Debt/Equity"
            value={fmt(f.debtToEquity, 1, '%')}
            color={f.debtToEquity !== null ? (f.debtToEquity < 50 ? 'text-emerald-400' : f.debtToEquity < 150 ? 'text-amber-400' : 'text-red-400') : undefined}
          />
          <Row label="LT Debt/Equity" value={fmt(f.ltDebtToEquity, 2)} />
          <Row label="Current Ratio"
            value={fmt(f.currentRatio, 2)}
            color={f.currentRatio !== null ? (f.currentRatio >= 1.5 ? 'text-emerald-400' : f.currentRatio >= 1 ? 'text-amber-400' : 'text-red-400') : undefined}
          />
        </Section>

        {/* Analyst Consensus */}
        <Section title="Analyst Consensus" icon="🎯">
          {f.recommendation ? (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Rating</span>
              <span className={`text-sm font-bold ${recColor}`}>{f.recommendation}</span>
            </div>
          ) : null}
          <AnalystBar buy={f.analystBuy} hold={f.analystHold} sell={f.analystSell} />
          <div className="mt-3 pt-2 border-t border-gray-800">
            <p className="text-xs text-gray-600 leading-relaxed">
              Based on {f.analystBuy + f.analystHold + f.analystSell} analyst recommendations from Finnhub.
              Always combine with your own technical analysis.
            </p>
          </div>
        </Section>

      </div>

      <p className="text-xs text-gray-700">
        Source: Finnhub · TTM = Trailing Twelve Months · Data cached 1 hour
      </p>
    </div>
  );
}
