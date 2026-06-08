'use client';

/**
 * AnalystWriteUp
 * Generates a structured deep-dive write-up from available stock data.
 * Purely data-driven — no external API needed.
 */

import type { AnalysisResult } from '@/lib/analysis';
import type { Financials }     from '@/lib/finnhub';

// ── Static sector / subsector map for common tickers ─────────────────────────

const SUBSECTOR_MAP: Record<string, { subsector: string; description: string }> = {
  // Semiconductors
  NVDA:  { subsector: 'AI Semiconductors',       description: 'Designs GPUs and AI accelerators (H100/Blackwell). Revenue ~85% data center. CUDA software ecosystem is the primary moat.' },
  AMD:   { subsector: 'AI Semiconductors',       description: 'Designs CPUs (EPYC) and GPUs (MI300X). Strong data center momentum challenging Intel and NVIDIA in HPC workloads.' },
  INTC:  { subsector: 'Semiconductors',          description: 'Designs and manufactures CPUs. Executing a major foundry transition (Intel 18A process). Turnaround in progress.' },
  AVGO:  { subsector: 'Semiconductors',          description: 'Designs custom AI ASICs (XPUs) for Google and Meta. Also dominant in networking (Ethernet) and storage ICs.' },
  QCOM:  { subsector: 'Semiconductors',          description: 'Designs mobile SoCs (Snapdragon) and wireless modems. Expanding into automotive and PC chips (Snapdragon X).' },
  TSM:   { subsector: 'Semiconductor Foundry',   description: 'World\'s largest chip foundry. Manufactures chips for NVIDIA, Apple, AMD. Arizona fab buildout is a key geopolitical story.' },
  MRVL:  { subsector: 'Semiconductors',          description: 'Designs custom AI ASICs and data center networking chips. Major customer wins with cloud hyperscalers.' },
  MU:    { subsector: 'Memory Semiconductors',   description: 'Manufactures DRAM and NAND flash. HBM3E memory for AI GPUs is a high-margin growth vector.' },
  AMAT:  { subsector: 'Semiconductor Equipment', description: 'Supplies wafer fabrication equipment to chipmakers. Revenue tied directly to semiconductor capex cycles.' },
  LRCX:  { subsector: 'Semiconductor Equipment', description: 'Designs etch and deposition equipment. Critical supplier to TSMC, Samsung, and Intel fabs.' },
  KLAC:  { subsector: 'Semiconductor Equipment', description: 'Makes process control and yield management systems for chip fabs. High-margin business with pricing power.' },
  ASML:  { subsector: 'Semiconductor Equipment', description: 'Sole supplier of EUV lithography machines — no competitor exists. Every advanced chip requires ASML equipment.' },
  // AI Infrastructure
  APLD:  { subsector: 'AI Data Centers',         description: 'Builds and operates HPC data centers optimized for AI workloads. Leases capacity under long-term contracts. Power procurement is the core moat.' },
  CORZ:  { subsector: 'AI Data Centers',         description: 'Operates data centers and HPC hosting. Transitioning from Bitcoin mining to AI compute infrastructure.' },
  SMCI:  { subsector: 'AI Server Hardware',      description: 'Builds AI server systems integrating NVIDIA GPUs. Direct-liquid cooling expertise is a differentiator.' },
  DELL:  { subsector: 'AI Server Hardware',      description: 'Sells PowerEdge AI servers with NVIDIA GPUs to enterprises. AI server backlog is a key growth driver.' },
  HPE:   { subsector: 'Enterprise Hardware',     description: 'Sells enterprise servers, networking, and storage. GreenLake cloud services model is the growth engine.' },
  // Mega-Cap Cloud & Software
  MSFT:  { subsector: 'Cloud & Enterprise Software', description: 'Azure (cloud), Microsoft 365 (productivity), and GitHub/OpenAI partnership. Copilot AI assistant embedded across all products.' },
  GOOGL: { subsector: 'Cloud & Search Advertising',  description: 'Google Search (~75% of revenue), Google Cloud (28% growth), YouTube, and Waymo autonomous driving.' },
  GOOG:  { subsector: 'Cloud & Search Advertising',  description: 'Same as GOOGL. Class C shares with no voting rights.' },
  AMZN:  { subsector: 'Cloud & E-Commerce',          description: 'AWS (#1 cloud, ~60% of operating profit), advertising (~$60B run rate), and the world\'s largest e-commerce platform.' },
  CRM:   { subsector: 'Enterprise Software',         description: 'Leads the CRM market with Sales Cloud, Service Cloud, and AI-powered Agentforce. Recurring subscription model.' },
  NOW:   { subsector: 'Enterprise Software',         description: 'IT workflow automation platform. AI-powered workflows are accelerating enterprise adoption.' },
  ORCL:  { subsector: 'Cloud & Database',            description: 'Cloud infrastructure (OCI) growing faster than expected. Database licensing remains a sticky cash cow.' },
  SAP:   { subsector: 'Enterprise Software',         description: 'Global leader in ERP software. Cloud transition accelerating. Strong moat in large enterprise back-office systems.' },
  WDAY:  { subsector: 'Enterprise Software',         description: 'HR and finance cloud applications. Strong renewal rates and expanding platform into AI-driven workforce management.' },
  // Ad Tech / Social Media
  META:  { subsector: 'Social Media & Ad Tech',  description: 'Monetizes 3.3B DAU across Facebook, Instagram, WhatsApp via digital advertising. Reality Labs (VR) loses ~$5B/yr.' },
  SNAP:  { subsector: 'Social Media & Ad Tech',  description: 'Snapchat platform with 400M+ DAU. Struggling with monetization vs TikTok and Instagram. Highly volatile small-cap.' },
  PINS:  { subsector: 'Social Media & Ad Tech',  description: 'Visual discovery platform with 518M MAU. Strong lower-funnel e-commerce ad formats. Profitability improving.' },
  RDDT:  { subsector: 'Social Media & Ad Tech',  description: 'Community-based social platform. Data licensing to AI companies is a novel revenue stream. Early monetization stage.' },
  TTD:   { subsector: 'Programmatic Ad Tech',    description: 'Independent demand-side platform for programmatic advertising. Benefits from cookie deprecation and CTV growth.' },
  // Consumer Tech & Hardware
  AAPL:  { subsector: 'Consumer Tech & Ecosystem', description: 'iPhone, Services (App Store/iCloud/Apple Pay), Mac, and iPad. 2.2B active devices. Services is the high-margin growth engine.' },
  // EV / Robotics / Energy
  TSLA:  { subsector: 'EV & AI Robotics',        description: 'EVs (Model 3/Y/Cybertruck), energy storage (Megapack), Full Self-Driving software, and Optimus humanoid robot.' },
  RIVN:  { subsector: 'EV Manufacturing',        description: 'EV trucks and vans (R1T/R1S/commercial). Amazon delivery van contract. Pre-profitability, cash burn is high.' },
  NIO:   { subsector: 'EV Manufacturing',        description: 'Chinese premium EV maker. Battery-as-a-Service (BaaS) model. Facing intense domestic competition from BYD.' },
  // Managed Care / Healthcare
  UNH:   { subsector: 'Managed Care',            description: 'UnitedHealthcare (insurance) + Optum (pharmacy benefits, care delivery, data analytics). Vertical integration is the moat.' },
  CVS:   { subsector: 'Healthcare Services',     description: 'Pharmacy retail, PBM (Caremark), and Aetna health insurance. Integrating into a primary care platform.' },
  HUM:   { subsector: 'Managed Care',            description: 'Health insurance focused on Medicare Advantage. Elevated medical cost ratio has pressured margins.' },
  ELV:   { subsector: 'Managed Care',            description: 'Elevance Health (formerly Anthem). Medicaid, Medicare, and commercial health insurance. Carelon services division growing.' },
  // Biotech / Pharma
  LLY:   { subsector: 'Pharma / GLP-1',          description: 'Leads the GLP-1 market (Mounjaro/Zepbound for diabetes/obesity). One of the fastest-growing large-cap pharma stocks.' },
  NVO:   { subsector: 'Pharma / GLP-1',          description: 'Ozempic/Wegovy GLP-1 pioneer. Faces competition from Eli Lilly. Massive global demand for obesity treatment.' },
  ABBV:  { subsector: 'Biopharmaceuticals',      description: 'Immunology (Humira successor Skyrizi/Rinvoq), neuroscience, and oncology. Post-Humira cliff transition largely successful.' },
  MRNA:  { subsector: 'Biotechnology',           description: 'mRNA platform beyond COVID vaccines. Pipeline includes RSV, flu combo, cancer vaccines. Post-COVID revenue decline.' },
  // Financials
  JPM:   { subsector: 'Money Center Banks',      description: 'Largest US bank by assets. Investment banking, commercial banking, consumer retail, and asset management.' },
  GS:    { subsector: 'Investment Banking',      description: 'Premier investment bank and asset manager. Trading and M&A advisory. Benefit from capital markets cycle rebound.' },
  V:     { subsector: 'Payment Networks',        description: 'Global payment network processing $14T+ annually. Asset-light model with ~50%+ net margins. Near-monopoly with Mastercard.' },
  MA:    { subsector: 'Payment Networks',        description: 'Global payment network duopoly with Visa. Expanding in B2B payments and cross-border transactions.' },
  PYPL:  { subsector: 'Digital Payments',        description: 'PayPal + Venmo. Losing consumer mindshare to Apple Pay and competing wallets. Braintree merchant payments holds up.' },
  // Consumer
  AMZN_RETAIL: { subsector: 'E-Commerce',        description: 'Amazon retail operations.' },
  WMT:   { subsector: 'Consumer Retail',         description: 'Largest retailer globally. E-commerce and advertising growing double-digit. Flipkart (India) is a long-term asset.' },
  COST:  { subsector: 'Warehouse Retail',        description: 'Membership warehouse model. Renewal rates ~92%+. Consistent traffic and volume growth regardless of economic cycle.' },
  // Industrial / Defence
  RTX:   { subsector: 'Defence & Aerospace',     description: 'Raytheon missiles and defence electronics + Pratt & Whitney jet engines. Ukraine/Taiwan tensions are tailwinds.' },
  LMT:   { subsector: 'Defence Aerospace',       description: 'F-35 fighter jet, missiles, and space systems. Largest US defence contractor. Backlog visibility is strong.' },
  // Energy
  XOM:   { subsector: 'Integrated Oil & Gas',    description: 'ExxonMobil. Upstream production, refining, and chemicals. Pioneer Natural Resources acquisition expanded Permian Basin.' },
  CVX:   { subsector: 'Integrated Oil & Gas',    description: 'Chevron. Hess acquisition gives access to Guyana deepwater. Strong free cash flow and buyback program.' },
  // Commodities / ETFs
  GLD:   { subsector: 'Precious Metals ETF',     description: 'SPDR Gold Shares — tracks spot gold. Driven by real interest rates, USD strength, central bank buying, and geopolitical risk.' },
  SLV:   { subsector: 'Precious Metals ETF',     description: 'iShares Silver Trust — tracks spot silver. Dual demand: monetary safe haven + industrial (solar, EVs, electronics).' },
  GDX:   { subsector: 'Gold Miners ETF',         description: 'Tracks basket of gold mining companies. Leveraged play on gold price — moves 2-3x gold price changes.' },
  USO:   { subsector: 'Crude Oil ETF',           description: 'Tracks WTI crude oil futures. Subject to contango roll costs. Use for short-term macro oil exposure only.' },
  // Crypto-adjacent
  COIN:  { subsector: 'Crypto Exchange',         description: 'Coinbase — largest US crypto exchange. Revenue highly correlated to crypto trading volumes and BTC price.' },
  MSTR:  { subsector: 'Bitcoin Treasury Company',description: 'MicroStrategy. Holds 200K+ BTC on balance sheet. Effectively a leveraged Bitcoin proxy, not a software company.' },
  HOOD:  { subsector: 'Retail Brokerage',        description: 'Robinhood. Commission-free trading app. Revenue from PFOF, margin lending, and crypto. Volatile, retail-driven.' },
  // Telecom / Media
  NFLX:  { subsector: 'Streaming Media',         description: 'Global streaming leader. Password-sharing crackdown drove subscriber re-acceleration. Ad-supported tier growing.' },
  DIS:   { subsector: 'Entertainment & Streaming', description: 'Disney+ streaming, theme parks, and movie studios. Streaming profitability improving. ESPN transition to streaming key.' },
  SPOT:  { subsector: 'Music Streaming',         description: 'Largest music streaming platform. Podcast pivot showing mixed results. Pricing power improving margins.' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function signalLabel(s: string): string {
  const map: Record<string, string> = {
    BREAKOUT:    'Breakout',
    PULLBACK:    'Healthy Pullback',
    WATCH:       'Neutral / Watch',
    AVOID:       'Downtrend — Avoid',
    MEAN_REVERT: 'Mean Reversion Candidate',
  };
  return map[s] ?? s;
}

function trendVerdict(score: number, signal: string): string {
  if (score >= 5 && signal === 'BREAKOUT')  return '🟢 Strong uptrend — trend-following entries valid';
  if (score >= 5 && signal === 'PULLBACK')  return '🟡 Uptrend intact — pullback may offer better entry';
  if (score >= 4 && signal === 'WATCH')     return '🟡 Trend recovering — monitor for confirmation';
  if (score <= 1 && signal === 'AVOID')     return '🔴 Downtrend — all key MAs violated. Avoid new longs';
  if (score <= 2)                           return '🔴 Weak trend — multiple MAs broken';
  return '🟡 Mixed signals — selective entries only';
}

function rsiComment(rsi: number): string {
  if (rsi < 30) return `RSI ${rsi.toFixed(1)} — deeply oversold. High probability of technical bounce, but confirm with price action before entering.`;
  if (rsi < 40) return `RSI ${rsi.toFixed(1)} — oversold territory. Approaching levels where buyers typically step in.`;
  if (rsi < 55) return `RSI ${rsi.toFixed(1)} — neutral momentum. No extreme reading in either direction.`;
  if (rsi < 70) return `RSI ${rsi.toFixed(1)} — healthy bullish momentum. Room to run before overbought.`;
  return `RSI ${rsi.toFixed(1)} — overbought. Upside momentum is strong but risk of short-term pullback elevated.`;
}

function fundamentalComment(
  pe: number, rev: number | null, roe: number | null, margin: number | null
): string {
  const parts: string[] = [];
  if (pe > 0) {
    if (pe > 100) parts.push(`P/E of ${pe.toFixed(0)}x is speculative — requires aggressive future growth to justify`);
    else if (pe > 40) parts.push(`P/E of ${pe.toFixed(0)}x is premium-priced — no margin for error on earnings`);
    else if (pe > 20) parts.push(`P/E of ${pe.toFixed(0)}x is reasonable for a growth business`);
    else parts.push(`P/E of ${pe.toFixed(0)}x is attractive, suggesting value pricing`);
  }
  if (rev != null) {
    if (rev >= 20) parts.push(`strong revenue growth of ${rev.toFixed(0)}%`);
    else if (rev >= 10) parts.push(`healthy revenue growth of ${rev.toFixed(0)}%`);
    else if (rev >= 0) parts.push(`modest revenue growth of ${rev.toFixed(0)}%`);
    else parts.push(`declining revenue (${rev.toFixed(0)}%) is a concern`);
  }
  if (roe != null && roe > 0) {
    if (roe >= 20) parts.push(`excellent capital efficiency (ROE ${roe.toFixed(0)}%)`);
    else if (roe >= 10) parts.push(`adequate return on equity (${roe.toFixed(0)}%)`);
  }
  if (margin != null) {
    if (margin >= 20) parts.push(`wide net margins of ${margin.toFixed(0)}%`);
    else if (margin >= 8) parts.push(`decent net margins of ${margin.toFixed(0)}%`);
    else if (margin < 0) parts.push(`negative net margin (${margin.toFixed(0)}%) — currently unprofitable`);
  }
  return parts.length > 0 ? parts.join('; ') + '.' : 'Limited fundamental data available.';
}

function swingVerdict(score: number, signal: string, rsi: number, offHigh: number): string {
  if (score >= 5 && signal === 'BREAKOUT' && rsi < 70)
    return '✅ Strong swing candidate — trend + momentum aligned. Entry on breakout confirmation.';
  if (score >= 4 && signal === 'PULLBACK' && rsi < 50)
    return '✅ Good swing setup — trend intact, pulled back to potential support. Wait for reversal candle.';
  if (signal === 'MEAN_REVERT' && rsi < 35)
    return '⚠️ Speculative oversold bounce possible. Short-term trade only — confirm with volume.';
  if (signal === 'AVOID' || score <= 1)
    return '❌ Not a swing candidate. Downtrend active — shorting requires expertise; avoid longs.';
  if (offHigh > 30)
    return '⚠️ Stock is far from 52-week highs. Better opportunities exist unless a specific catalyst is present.';
  return '🟡 Neutral setup. Wait for clearer signal before committing capital.';
}

function convictionVerdict(score: number, signal: string, pe: number, offHigh: number): string {
  if (score >= 5 && (signal === 'BREAKOUT' || signal === 'PULLBACK') && offHigh <= 15)
    return '⭐ High conviction — strong technicals, healthy trend, near highs. Core position candidate.';
  if (score >= 4 && offHigh <= 20 && pe > 0 && pe < 50)
    return '✅ Moderate conviction — decent setup but monitor for trend confirmation.';
  if (signal === 'AVOID' || score <= 1)
    return '❌ Low conviction — avoid until trend rebuilds. Great company ≠ great stock right now.';
  if (pe > 80 && pe !== 0)
    return '⚠️ Speculative — valuation relies entirely on future optionality being realised.';
  return '🟡 Wait-and-see — let the setup develop before committing.';
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  analysis:   AnalysisResult & { name?: string; sector?: string; revenueGrowth?: number | null; roeTTM?: number | null; operatingMargin?: number | null; profitMargin?: number | null; analystRating?: string | null; analystBuy?: number; analystHold?: number; analystSell?: number; };
  financials: Financials | null;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function AnalystWriteUp({ analysis: a, financials: f }: Props) {
  const info    = SUBSECTOR_MAP[a.symbol];
  const subsect = info?.subsector ?? a.sector ?? 'Uncategorized';
  const bizDesc = info?.description ?? `${a.name ?? a.symbol} operates in the ${a.sector ?? 'broader market'}.`;

  const pe        = a.peRatio       ?? 0;
  const rev       = a.revenueGrowth ?? f?.revenueGrowthYoy   ?? null;
  const roe       = a.roeTTM        ?? f?.roeTTM             ?? null;
  const margin    = a.profitMargin  ?? f?.netMargin          ?? null;
  const opMargin  = a.operatingMargin ?? f?.operatingMargin  ?? null;
  const d2e       = f?.debtToEquity ?? null;
  const totalAnalysts = (a.analystBuy ?? 0) + (a.analystHold ?? 0) + (a.analystSell ?? 0);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900/80">
        <span className="text-lg">📋</span>
        <div>
          <h2 className="text-sm font-bold text-white">Analyst Deep Dive</h2>
          <p className="text-[10px] text-gray-500">{subsect} · Data-driven write-up based on current technicals &amp; fundamentals</p>
        </div>
      </div>

      <div className="p-5 space-y-6 text-sm">

        {/* ── 1. Business Model ── */}
        <section>
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">🏢 Business Model</h3>
          <p className="text-gray-300 leading-relaxed">{bizDesc}</p>
          {a.sector && (
            <p className="text-[11px] text-gray-600 mt-1">Sector: {a.sector} · Subsector: {subsect}</p>
          )}
        </section>

        {/* ── 2. Technical Assessment ── */}
        <section>
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">📈 Technical Assessment</h3>
          <div className="space-y-2 text-gray-300 leading-relaxed">
            <p>
              <span className="font-semibold text-white">Signal: </span>
              {signalLabel(a.signal)} — {trendVerdict(a.minerviniScore, a.signal)}
            </p>
            <p>
              <span className="font-semibold text-white">Momentum: </span>
              {rsiComment(a.rsi)}
            </p>
            <p>
              <span className="font-semibold text-white">Trend structure (Minervini): </span>
              {a.minerviniScore}/6 conditions met.{' '}
              {a.minerviniScore >= 5
                ? 'All primary trend conditions aligned — institutional-quality setup.'
                : a.minerviniScore >= 3
                ? 'Partial trend alignment — watch for the remaining conditions to resolve.'
                : 'Most trend conditions violated — the stock is in distribution or downtrend.'}
            </p>
            <p>
              <span className="font-semibold text-white">Distance from 52-week high: </span>
              -{a.distanceFromHigh.toFixed(1)}%.{' '}
              {a.distanceFromHigh <= 5
                ? 'Near all-time / 52-week highs — breakout zone, institutional interest high.'
                : a.distanceFromHigh <= 15
                ? 'Moderate pullback from highs — within normal correction range for healthy stocks.'
                : a.distanceFromHigh <= 30
                ? 'Significant drawdown. Needs a catalyst or trend reversal to recover.'
                : 'Deep pullback — stock has lost more than 30% from peak. High risk.'}
            </p>
            {a.pattern && (
              <p>
                <span className="font-semibold text-white">Pattern detected: </span>
                {a.pattern} — a candlestick signal on the most recent daily close.
              </p>
            )}
            <p>
              <span className="font-semibold text-white">Volatility: </span>
              ATR {a.atrPct.toFixed(1)}% of price.{' '}
              {a.atrPct > 3
                ? 'High daily volatility — position sizing discipline is critical. Use ATR-based stops.'
                : a.atrPct > 1.5
                ? 'Moderate volatility — good swing trading range.'
                : 'Low volatility — smaller moves per day. Better for steady accumulators than active traders.'}
            </p>
          </div>
        </section>

        {/* ── 3. Fundamental Health ── */}
        <section>
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">💰 Fundamental Health</h3>
          <p className="text-gray-300 leading-relaxed mb-2">
            {fundamentalComment(pe, rev, roe, margin)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            {pe > 0 && (
              <FundCell label="P/E Ratio" value={`${pe.toFixed(1)}x`}
                color={pe > 60 ? 'amber' : pe > 30 ? 'neutral' : 'green'} />
            )}
            {rev != null && (
              <FundCell label="Revenue Growth" value={`${rev >= 0 ? '+' : ''}${rev.toFixed(1)}%`}
                color={rev >= 10 ? 'green' : rev >= 0 ? 'amber' : 'red'} />
            )}
            {roe != null && roe > 0 && (
              <FundCell label="ROE (TTM)" value={`${roe.toFixed(1)}%`}
                color={roe >= 20 ? 'green' : roe >= 10 ? 'amber' : 'red'} />
            )}
            {opMargin != null && (
              <FundCell label="Op. Margin" value={`${opMargin.toFixed(1)}%`}
                color={opMargin >= 15 ? 'green' : opMargin >= 5 ? 'amber' : 'red'} />
            )}
            {margin != null && (
              <FundCell label="Net Margin" value={`${margin.toFixed(1)}%`}
                color={margin >= 10 ? 'green' : margin >= 0 ? 'amber' : 'red'} />
            )}
            {d2e != null && (
              <FundCell label="Debt/Equity" value={`${(d2e / 100).toFixed(2)}x`}
                color={d2e <= 50 ? 'green' : d2e <= 100 ? 'amber' : 'red'} />
            )}
          </div>
          {totalAnalysts > 0 && (
            <p className="text-[11px] text-gray-500 mt-3">
              Analyst consensus: <span className="text-white font-medium">{a.analystRating ?? '—'}</span>
              {' '}({a.analystBuy} Buy · {a.analystHold} Hold · {a.analystSell} Sell · {totalAnalysts} total)
            </p>
          )}
        </section>

        {/* ── 4. Bull / Bear ── */}
        <section>
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">⚖️ Key Arguments</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-3">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">Bull Case</p>
              <ul className="text-xs text-gray-300 space-y-1">
                {a.minerviniScore >= 4 && <li>· Trend structure intact ({a.minerviniScore}/6 Minervini)</li>}
                {a.signal === 'BREAKOUT' && <li>· Price in breakout mode — momentum buyers engaged</li>}
                {a.distanceFromHigh <= 10 && <li>· Near 52-week highs — institutional accumulation likely</li>}
                {(rev ?? 0) >= 15 && <li>· Strong revenue growth ({rev?.toFixed(0)}% YoY) signals healthy demand</li>}
                {(roe ?? 0) >= 15 && <li>· High ROE ({roe?.toFixed(0)}%) shows efficient capital use</li>}
                {pe > 0 && pe < 25 && <li>· Attractive valuation at {pe.toFixed(0)}x earnings — margin of safety</li>}
                {a.rsi < 40 && <li>· Oversold RSI ({a.rsi.toFixed(1)}) — potential technical bounce</li>}
                {(margin ?? 0) >= 15 && <li>· Wide net margins ({margin?.toFixed(0)}%) — pricing power evident</li>}
              </ul>
            </div>
            <div className="rounded-lg border border-red-900/40 bg-red-950/10 p-3">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5">Bear Case</p>
              <ul className="text-xs text-gray-300 space-y-1">
                {a.minerviniScore <= 2 && <li>· Trend breakdown — {6 - a.minerviniScore} of 6 MA conditions violated</li>}
                {a.signal === 'AVOID' && <li>· AVOID signal — active downtrend, no technical support</li>}
                {a.distanceFromHigh > 25 && <li>· -{a.distanceFromHigh.toFixed(0)}% from highs — significant distribution</li>}
                {pe > 60 && pe !== 0 && <li>· Elevated P/E ({pe.toFixed(0)}x) — expensive, no margin for error</li>}
                {(rev ?? 1) < 0 && <li>· Negative revenue growth — business momentum declining</li>}
                {(margin ?? 1) < 0 && <li>· Unprofitable — depends on capital markets for funding</li>}
                {(d2e ?? 0) > 150 && <li>· High leverage ({((d2e ?? 0)/100).toFixed(1)}x D/E) — sensitive to rate rises</li>}
                {a.rsi > 70 && <li>· Overbought RSI ({a.rsi.toFixed(1)}) — pullback risk elevated</li>}
              </ul>
            </div>
          </div>
        </section>

        {/* ── 5. Trade Setup ── */}
        {a.entryZone && a.stopLoss && a.target && (
          <section>
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">🎯 Trade Setup</h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-gray-800/60 p-3">
                <div className="text-gray-500 mb-1">Entry Zone</div>
                <div className="font-bold text-white">${(a.entryZone as [number,number])[0].toFixed(2)} – ${(a.entryZone as [number,number])[1].toFixed(2)}</div>
              </div>
              <div className="rounded-lg bg-gray-800/60 p-3">
                <div className="text-gray-500 mb-1">Stop Loss</div>
                <div className="font-bold text-red-400">${(a.stopLoss as number).toFixed(2)}</div>
              </div>
              <div className="rounded-lg bg-gray-800/60 p-3">
                <div className="text-gray-500 mb-1">Target / R:R</div>
                <div className="font-bold text-emerald-400">${(a.target as number).toFixed(2)} <span className="text-gray-500 font-normal">({(a.rrRatio as number).toFixed(1)}R)</span></div>
              </div>
            </div>
          </section>
        )}

        {/* ── 6. Verdicts ── */}
        <section>
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">🏆 Verdicts</h3>
          <div className="space-y-2 text-xs">
            <div className="rounded-lg bg-gray-800/40 px-3 py-2">
              <span className="text-gray-500">Conviction (long-term hold):  </span>
              <span className="text-gray-200">{convictionVerdict(a.minerviniScore, a.signal, pe, a.distanceFromHigh)}</span>
            </div>
            <div className="rounded-lg bg-gray-800/40 px-3 py-2">
              <span className="text-gray-500">Swing trade:  </span>
              <span className="text-gray-200">{swingVerdict(a.minerviniScore, a.signal, a.rsi, a.distanceFromHigh)}</span>
            </div>
          </div>
        </section>

        <p className="text-[10px] text-gray-700 border-t border-gray-800 pt-3">
          Write-up generated from live technical &amp; fundamental data. For informational purposes only — not financial advice.
          All analysis reflects conditions at time of page load. Re-open to refresh.
        </p>
      </div>
    </div>
  );
}

// ── Mini fundamentals cell ────────────────────────────────────────────────────

function FundCell({ label, value, color }: { label: string; value: string; color: 'green' | 'amber' | 'red' | 'neutral' }) {
  const cls = {
    green:   'text-emerald-400',
    amber:   'text-amber-400',
    red:     'text-red-400',
    neutral: 'text-gray-300',
  }[color];
  return (
    <div className="rounded-lg bg-gray-800/50 px-3 py-2">
      <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm font-bold ${cls}`}>{value}</div>
    </div>
  );
}
