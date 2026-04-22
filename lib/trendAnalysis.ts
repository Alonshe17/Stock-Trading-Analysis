import type { Recommendation } from './recommendations';

export type StockCategory =
  | 'Defense & Aerospace'
  | 'Semiconductors'
  | 'AI & Cloud'
  | 'Healthcare & Pharma'
  | 'Energy & Oil'
  | 'Banking & Finance'
  | 'Payments & Fintech'
  | 'Consumer Defensive'
  | 'Consumer Cyclical'
  | 'EV & Clean Energy'
  | 'Crypto & Digital Assets'
  | 'Industrials'
  | 'E-Commerce & Tech'
  | 'AI Speculative';

export type CategoryMeta = {
  label: string;
  icon: string;
  color: string;       // tailwind text color class
  borderColor: string; // tailwind border color class
  bgColor: string;     // tailwind bg color class
  thesis: string;      // 2-3 sentence investment thesis
  tailwinds: string[]; // 3-5 key tailwinds
  risks: string[];     // 3-4 key risks
  horizon: 'Short-term' | 'Medium-term' | 'Long-term';
};

export const CATEGORY_META: Record<StockCategory, CategoryMeta> = {
  'Defense & Aerospace': {
    label: 'Defense & Aerospace',
    icon: '🛡️',
    color: 'text-slate-300',
    borderColor: 'border-slate-600',
    bgColor: 'bg-slate-800/40',
    thesis:
      'Geopolitical fragmentation and NATO re-armament are driving multi-year defense budget expansion across Western nations. US defense spending recently crossed $850B annually with bipartisan support, and European NATO members are finally meeting — or exceeding — the 2% GDP target after Russia\'s Ukraine invasion. The backlog at the prime contractors (LMT, RTX, NOC, GD) stretches 3–5 years, providing extraordinary revenue visibility rarely seen in other sectors.',
    tailwinds: [
      'NATO re-armament: European members raising defense budgets to 2–3% of GDP',
      'US DoD budget growing ~5% annually with strong bipartisan support',
      '3–5 year production backlogs at LMT, RTX, NOC — revenue visibility is exceptional',
      'Hypersonic missiles, drone warfare, and space defense opening new TAMs',
      'Ukraine conflict consuming munitions inventory, accelerating replacement orders',
    ],
    risks: [
      'US debt ceiling / continuing resolution gridlock can delay appropriations',
      'Peace dividend risk if major conflicts de-escalate',
      'Supply-chain bottlenecks (titanium, rare earths) limiting production ramp',
      'Political pressure on defense spending if recession triggers austerity',
    ],
    horizon: 'Long-term',
  },

  'Semiconductors': {
    label: 'Semiconductors',
    icon: '⚡',
    color: 'text-yellow-300',
    borderColor: 'border-yellow-600',
    bgColor: 'bg-yellow-900/20',
    thesis:
      'The semiconductor sector is the picks-and-shovels play on every major technology wave: AI training, AI inference, EVs, IoT, and 5G all require exponentially more chips. NVIDIA\'s data center revenue surged from $15B to $100B+ in just three years, and the entire ecosystem — from ASML\'s lithography machines to TSMC\'s fabs to Broadcom\'s networking ASICs — is riding the same AI capex wave. The CHIPS Act and equivalent legislation globally are reshuffling supply chains, creating onshoring opportunities worth hundreds of billions.',
    tailwinds: [
      'AI data center buildout driving insatiable GPU/ASIC demand through 2027',
      'CHIPS Act funding ($52B US) + EU/Japan equivalents onshoring fab capacity',
      'EV and autonomous vehicles increasing chip content per car 10–20x vs ICE',
      'Advanced packaging (CoWoS, HBM) creating new high-margin product categories',
      'Edge AI inference pushing semiconductor content into every consumer device',
    ],
    risks: [
      'US export controls restricting China sales — NVDA/AMD lost ~$5B+ in China revenue',
      'Cyclical oversupply risk if AI capex cools or hyperscaler spending pulls back',
      'TSMC concentration risk — single point of failure for most advanced chips',
      'Geopolitical Taiwan risk is existential tail risk for the entire industry',
    ],
    horizon: 'Long-term',
  },

  'AI & Cloud': {
    label: 'AI & Cloud',
    icon: '🤖',
    color: 'text-blue-300',
    borderColor: 'border-blue-600',
    bgColor: 'bg-blue-900/20',
    thesis:
      'Hyperscaler cloud providers (AWS, Azure, GCP) are simultaneously the infrastructure backbone for AI and the fastest-growing enterprise software channels. Microsoft\'s Azure is growing 30%+ as Copilot monetization begins, AWS is reaccelerating after a cost-optimization hangover, and Google\'s TPU infrastructure gives it a cost advantage in AI inference. Enterprise AI adoption is still early innings — most Fortune 500 companies are in pilot phase, meaning the revenue ramp from AI SaaS is largely still ahead.',
    tailwinds: [
      'Enterprise AI adoption accelerating — most companies still in early deployment',
      'Azure, AWS, GCP capex expanding dramatically to meet AI workload demand',
      'AI agents and agentic workflows creating new recurring revenue streams',
      'Copilot / AI assistant monetization adding $10–30/seat/month to existing SaaS',
      'Open-source LLMs (Llama) lowering barriers, expanding total AI developer market',
    ],
    risks: [
      'Hyperscaler AI capex ($200B+ combined 2025) may outpace near-term monetization',
      'Commoditization risk as open-source models challenge proprietary offerings',
      'Regulatory risk — EU AI Act and potential US legislation could slow deployment',
      'Competition from Chinese AI models (DeepSeek) challenging cost assumptions',
    ],
    horizon: 'Long-term',
  },

  'Healthcare & Pharma': {
    label: 'Healthcare & Pharma',
    icon: '💊',
    color: 'text-green-300',
    borderColor: 'border-green-600',
    bgColor: 'bg-green-900/20',
    thesis:
      'GLP-1 obesity drugs (Ozempic, Wegovy, Zepbound, Mounjaro) represent one of the largest new drug categories in pharmaceutical history, with a TAM estimated at $150B+ annually by 2030. Eli Lilly and Novo Nordisk are capacity-constrained and raising prices simultaneously, creating an extraordinary margin expansion story. Beyond GLP-1, the sector benefits from aging demographics, AI-accelerated drug discovery, and ongoing genomic medicine breakthroughs in oncology and rare diseases.',
    tailwinds: [
      'GLP-1 obesity drug TAM estimated $150B+ by 2030 — still early in the ramp',
      'Aging demographics driving structural demand for chronic disease management',
      'AI-accelerated drug discovery compressing R&D timelines from 12 to 7+ years',
      'Oncology and gene therapy pipelines robust with multiple near-term catalysts',
      'IRA drug pricing pressure partially offset by Medicare Part D redesign benefits',
    ],
    risks: [
      'IRA drug pricing negotiations could compress future drug pricing power',
      'Pipeline failure risk — individual stocks can drop 30-50% on Phase 3 misses',
      'GLP-1 manufacturing scale-up challenges could create supply/demand imbalances',
      'Political pressure on pharma pricing in election years creates regulatory overhang',
    ],
    horizon: 'Long-term',
  },

  'Energy & Oil': {
    label: 'Energy & Oil',
    icon: '🛢️',
    color: 'text-orange-300',
    borderColor: 'border-orange-600',
    bgColor: 'bg-orange-900/20',
    thesis:
      'Major oil companies (XOM, CVX, SHEL) are generating record free cash flow, returning capital aggressively via buybacks and dividends while simultaneously investing in energy transition assets. The energy transition will take decades, not years — and the world needs sustained oil and gas investment to bridge the gap. Meanwhile, LNG export capacity expansion (US becoming world\'s largest LNG exporter) and European energy security post-Ukraine are structural tailwinds for natural gas prices and margins.',
    tailwinds: [
      'Record FCF generation funding buybacks at 4-8% annual yield + dividends',
      'LNG export expansion — US is world\'s largest LNG exporter with growing capacity',
      'European energy security driving long-term LNG/pipeline contracts',
      'AI data center electricity demand supporting natural gas prices structurally',
      'Permian Basin productivity improving — cost per barrel declining',
    ],
    risks: [
      'Oil price volatility — sustained sub-$60 WTI compresses margins significantly',
      'Energy transition acceleration could strand long-dated capital projects',
      'OPEC+ production decisions unpredictable and can flood the market',
      'Carbon tax risk in key markets (EU Carbon Border Adjustment Mechanism)',
    ],
    horizon: 'Medium-term',
  },

  'Banking & Finance': {
    label: 'Banking & Finance',
    icon: '🏦',
    color: 'text-cyan-300',
    borderColor: 'border-cyan-600',
    bgColor: 'bg-cyan-900/20',
    thesis:
      'Large-cap banks (JPM, BAC, GS, MS) benefit from elevated interest rates sustaining net interest income, while trading desks and investment banking are recovering from the 2022-2023 M&A drought. JPMorgan in particular is compounding at mid-teens ROE with fortress capital ratios and dominant market position in virtually every banking vertical. As the rate cycle turns, mortgage origination and capital markets activity should re-accelerate, adding a cyclical earnings boost.',
    tailwinds: [
      'Net interest income elevated while rates remain higher for longer',
      'M&A and IPO pipeline recovering — investment banking fees accelerating',
      'Buybacks running at 3-6% annual yield with strong capital generation',
      'AI-driven efficiency gains — banks deploying LLMs for cost reduction',
      'Deregulation tailwinds under current administration (Basel III Endgame rollback)',
    ],
    risks: [
      'Credit quality deterioration if unemployment rises (CRE loan losses)',
      'Rate cut cycle compressing net interest margins from peak levels',
      'Regulatory capital requirements under Basel III could constrain returns',
      'Recession risk triggering reserve builds and credit provision increases',
    ],
    horizon: 'Medium-term',
  },

  'Payments & Fintech': {
    label: 'Payments & Fintech',
    icon: '💳',
    color: 'text-violet-300',
    borderColor: 'border-violet-600',
    bgColor: 'bg-violet-900/20',
    thesis:
      'Visa and Mastercard operate a global payment duopoly that functions as a toll road on $25T+ of annual card spend, with virtually no credit risk on their own books and economics that improve with every dollar of global GDP growth. Fintech challengers (PayPal, Block) are fighting for share in adjacent niches but haven\'t meaningfully disrupted the network economics that make V and MA structurally dominant. The secular shift from cash to digital payments is still far from complete in EM markets.',
    tailwinds: [
      'Secular shift from cash to digital payments — only 50% of global transactions are card-based',
      'Cross-border payment volumes growing 10-15% annually with travel recovery',
      'Tap-to-pay, BNPL, and digital wallets expanding addressable spend',
      'EM market digitization (India UPI, LatAm, Africa) expanding addressable market',
      'Value-added services (data analytics, fraud detection) growing higher-margin revenue',
    ],
    risks: [
      'Real-time payment networks (FedNow, RTP) potentially disintermediating card rails',
      'Merchant pressure on interchange fees — regulatory risk in EU and UK',
      'Crypto payment rails long-term threat to traditional card networks',
      'Recession reducing discretionary consumer spend and cross-border travel',
    ],
    horizon: 'Long-term',
  },

  'Consumer Defensive': {
    label: 'Consumer Defensive',
    icon: '🛒',
    color: 'text-lime-300',
    borderColor: 'border-lime-600',
    bgColor: 'bg-lime-900/20',
    thesis:
      'Consumer staples (WMT, COST, PG, KO) are the portfolio ballast in an uncertain macro environment — these businesses generate steady cash flows regardless of recession, and their pricing power proved durable through the 2022-2024 inflation cycle. Walmart and Costco in particular are structural market share gainers: both are using scale, private label, and technology to widen their moats against competitors. These are "sleep well at night" positions that underperform in raging bull markets but protect capital when sentiment turns.',
    tailwinds: [
      'Defensive earnings resilience — revenues near-recession-proof',
      'Private-label growth accelerating as consumers trade down and margins improve',
      'Walmart and Costco digitizing supply chains for structural cost reduction',
      'Dividend growth histories of 20-50+ consecutive years provide income floor',
      'Flight-to-quality capital flows during equity market corrections',
    ],
    risks: [
      'Valuation premium over historical norms — expensive relative to growth rate',
      'Cost inflation (labor, transport, commodities) can temporarily compress margins',
      'Secular competition from ALDI, Lidl, and Amazon groceries',
      'Consumer trading-down reducing premium product mix and revenue per basket',
    ],
    horizon: 'Long-term',
  },

  'Consumer Cyclical': {
    label: 'Consumer Cyclical',
    icon: '🛍️',
    color: 'text-pink-300',
    borderColor: 'border-pink-600',
    bgColor: 'bg-pink-900/20',
    thesis:
      'Consumer discretionary names like Nike, McDonald\'s, and Starbucks have global brand moats that have historically recovered from every dip. Short-term headwinds (China slowdown, brand sentiment issues, value-seeking consumers) create buying opportunities in businesses with 20–30 year compounding track records. The middle-class consumer in Asia and LatAm is an underappreciated structural tailwind for premium consumer brands over the next decade.',
    tailwinds: [
      'Global middle-class expansion in Asia/LatAm — billions of new brand consumers',
      'Brand moat pricing power has survived every recession and recovered',
      'Digital direct-to-consumer channels improving margins vs wholesale',
      'AI-personalization increasing loyalty program engagement and repeat spend',
      'Recovery potential in China as stimulus takes effect',
    ],
    risks: [
      'Consumer confidence fragile — discretionary spend first to be cut in recession',
      'Brand reputation risks from social media amplification',
      'China slowdown disproportionately affecting global luxury/consumer brands',
      'Competition from private label and value alternatives gaining share',
    ],
    horizon: 'Medium-term',
  },

  'EV & Clean Energy': {
    label: 'EV & Clean Energy',
    icon: '⚡',
    color: 'text-emerald-300',
    borderColor: 'border-emerald-600',
    bgColor: 'bg-emerald-900/20',
    thesis:
      'The EV transition is proceeding despite near-term headwinds — charging infrastructure gaps, consumer range anxiety, and higher vehicle prices — because the long-term physics and economics are compelling. Tesla retains a multi-year manufacturing cost advantage and software ecosystem lead, while newer entrants (Rivian, NIO, XPEV) are fighting for survival in a cost-competitive market. Clean energy (Enphase, solar, wind) benefits from IRA tax credits that make the economics work even in high-rate environments.',
    tailwinds: [
      'IRA clean energy tax credits ($370B) creating durable economic incentives',
      'Battery technology costs declining 15-20% annually — EV economics improving',
      'Commercial fleet electrification (delivery vans, buses) accelerating',
      'Grid storage demand exploding as solar/wind intermittency requires buffering',
      'China EV market maturation demonstrating what the Western market will look like',
    ],
    risks: [
      'Higher interest rates make EV financing expensive, slowing consumer adoption',
      'Intense competition from Chinese OEMs (BYD, CATL) threatening pricing',
      'Policy risk — IRA credits could be scaled back under future administrations',
      'Range anxiety and charging infrastructure gaps still limit mass adoption',
    ],
    horizon: 'Long-term',
  },

  'Crypto & Digital Assets': {
    label: 'Crypto & Digital Assets',
    icon: '₿',
    color: 'text-amber-300',
    borderColor: 'border-amber-600',
    bgColor: 'bg-amber-900/20',
    thesis:
      'Bitcoin ETF approval by the SEC in January 2024 marked the beginning of institutional adoption at scale, with BlackRock, Fidelity, and others accumulating billions in BTC weekly. Coinbase is the dominant US regulated exchange, directly leveraged to crypto trading volumes and the broader adoption cycle. Crypto miners (MARA, RIOT) and MicroStrategy operate as high-beta Bitcoin proxies for investors seeking leveraged exposure. The regulatory environment has shifted meaningfully positive under the current administration.',
    tailwinds: [
      'Bitcoin ETF approval driving sustained institutional accumulation ($500M+ weekly inflows)',
      'Crypto-friendly regulatory environment under current US administration',
      'Bitcoin halving (April 2024) historically precedes 12-18 month bull cycles',
      'Stablecoin legislation advancing — legitimizing crypto as financial infrastructure',
      'Ethereum ETF approval expanding institutional digital asset universe',
    ],
    risks: [
      'Extreme volatility — Bitcoin can drop 50-70% from peaks in bear markets',
      'Regulatory reversal risk if administration changes or fraud scandals emerge',
      'FTX-style exchange failure risk remains (though Coinbase is regulated)',
      'Quantum computing long-term threat to current cryptographic security',
    ],
    horizon: 'Short-term',
  },

  'Industrials': {
    label: 'Industrials',
    icon: '🏭',
    color: 'text-stone-300',
    borderColor: 'border-stone-600',
    bgColor: 'bg-stone-800/40',
    thesis:
      'US industrial onshoring is a multi-decade structural story — semiconductor fabs, EV battery plants, defense manufacturing, and data centers are all being built or expanded domestically, requiring enormous quantities of construction equipment, automation, and industrial services. Caterpillar, Honeywell, and Boeing (aerospace/defense) are the picks-and-shovels plays on this capex supercycle. The industrial internet of things (IIoT) is adding a software layer to Honeywell and Siemens that compounds their earnings quality.',
    tailwinds: [
      'US manufacturing onshoring (CHIPS, IRA, defense) driving industrial capex supercycle',
      'AI data center construction boom requiring massive electrical and mechanical infrastructure',
      'Infrastructure spending (roads, bridges, airports) at multi-decade highs',
      'IIoT and industrial automation improving productivity and recurring revenue mix',
      'Aerospace recovery — commercial plane orders surging as Boeing/Airbus have 8-year backlogs',
    ],
    risks: [
      'Cyclical demand risk — industrial capex typically contracts 20-30% in recessions',
      'Boeing quality and safety issues creating reputational and regulatory risk',
      'Materials cost inflation (steel, copper, aluminum) compressing margins',
      'China construction slowdown reducing global demand for heavy equipment',
    ],
    horizon: 'Long-term',
  },

  'E-Commerce & Tech': {
    label: 'E-Commerce & Tech',
    icon: '📦',
    color: 'text-sky-300',
    borderColor: 'border-sky-600',
    bgColor: 'bg-sky-900/20',
    thesis:
      'Amazon is the world\'s most diversified technology company — AWS cloud growing margins, advertising revenue approaching $60B annually, and Prime membership creating one of the most powerful consumer flywheels ever built. The retail segment\'s thin margins have historically obscured the enormous profitability of AWS and ads. As same-day delivery and grocery capabilities improve, Amazon\'s moat in logistics is widening in ways that are difficult for any competitor to replicate.',
    tailwinds: [
      'AWS margin expansion as cost optimizations complete and AI workloads ramp',
      'Advertising revenue growing 20%+ — highly profitable against zero marginal cost inventory',
      'Same-day delivery expansion further cementing Prime membership loyalty',
      'International e-commerce markets (India, LatAm) still early in monetization',
      'Alexa and ambient commerce creating long-term voice/AI commerce moat',
    ],
    risks: [
      'Antitrust and regulatory risk — FTC scrutiny of Amazon marketplace practices',
      'AWS competition from Azure and GCP intensifying in enterprise accounts',
      'Labor costs and fulfillment network capex headwinds compressing retail margins',
      'China geopolitical tension affecting global supply chain reliability',
    ],
    horizon: 'Long-term',
  },

  'AI Speculative': {
    label: 'AI Speculative',
    icon: '🚀',
    color: 'text-fuchsia-300',
    borderColor: 'border-fuchsia-600',
    bgColor: 'bg-fuchsia-900/20',
    thesis:
      'AI-adjacent speculative names (APLD, SMCI, PLTR, SOUN, AI, BBAI) offer asymmetric upside on the AI adoption curve but carry significantly higher risk than large-cap AI plays. These are typically smaller companies with high revenue growth, elevated valuations, and binary catalyst risk — a single contract win, partnership announcement, or earnings miss can move a stock 30-50% in either direction. Position sizing discipline is critical: these are swing trade or speculative allocation candidates, not core portfolio holdings.',
    tailwinds: [
      'AI infrastructure demand (data centers, servers, power) growing faster than expected',
      'Enterprise AI adoption creating new markets for specialized AI software/services',
      'Government and defense AI contracts providing large non-dilutive revenue opportunities',
      'Small-cap AI names benefit disproportionately from sector sentiment rotation',
      'M&A activity — larger players (Microsoft, Google, Amazon) acquiring AI startups',
    ],
    risks: [
      'Accounting/governance risks — some AI companies have weak internal controls',
      'Cash burn — many are not profitable and depend on equity markets for survival',
      'Competition from better-capitalized hyperscalers building similar capabilities in-house',
      'Valuation risk — revenue multiples of 20-50x leave no margin for execution errors',
    ],
    horizon: 'Short-term',
  },
};

// Stock-specific notes for well-known names
export const STOCK_NOTES: Record<string, string> = {
  UNH: 'Under DOJ investigation for Medicare billing — near-term overhang. But 20-year EPS CAGR >15%, dominant managed care position, and $370B revenue base remain structurally intact.',
  BA:   'Quality control scandals and MAX door-plug incident created near-term pain. $500B+ backlog, near-duopoly with Airbus, and defense contracts provide long-term floor.',
  NVDA: 'AI GPU dominance with 80%+ data center share. CUDA ecosystem creates multi-year switching-cost moat. Blackwell GPU demand exceeds supply through 2025.',
  NKE:  'CEO transition + China headwinds + DTC strategy reset. Global brand moat intact — historic dips have been long-term buying opportunities.',
  TSLA: 'Brand sentiment pressure from Musk geopolitics. But FSD progress, energy storage growth, and Optimus robot optionality are undervalued in current price.',
  DIS:  'Streaming turned profitable in 2024. Theme park moat intact. ESPN deal/spinoff is a potential catalyst. Recovering from content cost overspend.',
  BABA: 'China regulatory overhang weighing on valuation. Trading at 8-10x earnings with cloud growing and buybacks accelerating. Key risk = US-China tensions.',
  LLY:  'GLP-1 drugs (Zepbound/Mounjaro) manufacturing capacity ramping fast. Obesity drug TAM estimated $150B+ by 2030. Premium valuation justified by pipeline depth.',
  SMCI: 'Accounting restatement concerns created overhang. AI server demand is real, margins improving. High risk/reward — small position size appropriate.',
  APLD: 'Pure-play AI data center operator. Revenue growing fast but not yet profitable. Sensitive to power costs and GPU availability — classic high-risk swing trade.',
  AMZN: 'AWS cloud margins expanding, advertising growing 20%+, AI infrastructure investment substantial. Retail headwinds masked by AWS/ads profitability acceleration.',
  META: 'Llama open-source AI strategy paying off. Reality Labs losses narrowing. Advertising targeting improved by AI. Demographic risk (young users) is real but overstated.',
  MSFT: 'Azure AI cloud growing 30%+. Copilot monetization still early innings. OpenAI partnership and enterprise AI distribution are durable competitive advantages.',
  RIVN: 'Cash burn improving, Volkswagen partnership adds credibility. Amazon delivery van contract provides revenue floor. Long road to profitability but strategic value clear.',
  COIN: 'Dominant US crypto exchange — highly correlated to Bitcoin price. Fee compression risk from competition. Beneficiary of crypto-friendly regulatory environment.',
};

export type DipAnalysis = {
  isDip: boolean;
  severity: 'mild' | 'moderate' | 'deep';
  reason: string;
  longTermIntact: boolean;
};

export function detectDipOpportunity(rec: Recommendation): DipAnalysis {
  const { price, ema200, distanceFromHigh, rsi, minerviniScore, signal } = rec;

  // Long-term trend is intact if price > EMA200 (or very close)
  const longTermIntact = ema200 > 0 ? price >= ema200 * 0.92 : false;

  // Not a dip if it's already a breakout signal (at highs, no dip)
  if (signal === 'BREAKOUT') {
    return {
      isDip: false,
      severity: 'mild',
      reason: 'Stock is at or near 52-week high — breakout territory, not a dip.',
      longTermIntact,
    };
  }

  // Deep dip: >25% below high AND oversold
  if (distanceFromHigh >= 25 && rsi <= 38) {
    return {
      isDip: true,
      severity: 'deep',
      reason: `Down ${distanceFromHigh.toFixed(0)}% from 52-week high with RSI ${rsi.toFixed(0)} — deeply oversold. ${longTermIntact ? 'Long-term trend still intact.' : 'Long-term trend broken — higher risk.'}`,
      longTermIntact,
    };
  }

  // Moderate dip: 15–35% below high AND rsi < 50, Minervini score still decent
  if (distanceFromHigh >= 15 && rsi <= 50 && minerviniScore >= 3) {
    return {
      isDip: true,
      severity: 'moderate',
      reason: `Down ${distanceFromHigh.toFixed(0)}% from 52-week high, RSI ${rsi.toFixed(0)}, Minervini ${minerviniScore}/6. Consolidation within an intact uptrend.`,
      longTermIntact,
    };
  }

  // Mild dip: 8–20% below high with pullback signal
  if (distanceFromHigh >= 8 && distanceFromHigh < 20 && (signal === 'PULLBACK' || signal === 'WATCH') && rsi <= 55) {
    return {
      isDip: true,
      severity: 'mild',
      reason: `Down ${distanceFromHigh.toFixed(0)}% from recent high with RSI ${rsi.toFixed(0)} — pulling back to support zone.`,
      longTermIntact,
    };
  }

  return {
    isDip: false,
    severity: 'mild',
    reason: 'No significant dip detected — stock is near normal trading range.',
    longTermIntact,
  };
}

export function getLongTermTrend(
  price: number,
  ema200: number,
): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (ema200 <= 0) {
    return {
      label: 'No Data',
      color: 'text-gray-400',
      bg: 'bg-gray-800/50',
      border: 'border-gray-700',
    };
  }

  const pctAbove = ((price - ema200) / ema200) * 100;

  if (pctAbove >= 10) {
    return {
      label: `↑ ${pctAbove.toFixed(0)}% above 200 EMA`,
      color: 'text-emerald-300',
      bg: 'bg-emerald-900/30',
      border: 'border-emerald-700/50',
    };
  }

  if (pctAbove >= 0) {
    return {
      label: `↗ ${pctAbove.toFixed(0)}% above 200 EMA`,
      color: 'text-green-300',
      bg: 'bg-green-900/30',
      border: 'border-green-700/50',
    };
  }

  if (pctAbove >= -8) {
    return {
      label: `↘ ${Math.abs(pctAbove).toFixed(0)}% below 200 EMA`,
      color: 'text-amber-300',
      bg: 'bg-amber-900/30',
      border: 'border-amber-700/50',
    };
  }

  return {
    label: `↓ ${Math.abs(pctAbove).toFixed(0)}% below 200 EMA`,
    color: 'text-red-300',
    bg: 'bg-red-900/30',
    border: 'border-red-700/50',
  };
}

export function getFundamentalHealth(rec: Recommendation): {
  label: 'Strong' | 'Moderate' | 'Weak' | 'Unknown';
  color: string;
  score: number; // 0-4
} {
  const { revenueGrowth, earningsGrowth, profitMargin, analystRating } = rec;

  // If we have no data at all, return Unknown
  const dataPoints = [revenueGrowth, earningsGrowth, profitMargin, analystRating].filter(
    (v) => v !== null && v !== undefined,
  );
  if (dataPoints.length === 0) {
    return { label: 'Unknown', color: 'text-gray-500', score: 0 };
  }

  let score = 0;

  // Revenue growth: 1 point if > 5%
  if (revenueGrowth !== null && revenueGrowth > 0.05) score++;

  // Earnings growth: 1 point if > 0%
  if (earningsGrowth !== null && earningsGrowth > 0) score++;

  // Profit margin: 1 point if > 10%
  if (profitMargin !== null && profitMargin > 0.10) score++;

  // Analyst rating: 1 point for Buy or Strong Buy
  if (analystRating === 'Buy' || analystRating === 'Strong Buy') score++;

  if (score >= 3) {
    return { label: 'Strong', color: 'text-emerald-400', score };
  }
  if (score === 2) {
    return { label: 'Moderate', color: 'text-amber-400', score };
  }
  return { label: 'Weak', color: 'text-red-400', score };
}
