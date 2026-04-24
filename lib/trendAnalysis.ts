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

// Stock-specific notes for well-known names — covers US large-caps, ADRs, and growth names
export const STOCK_NOTES: Record<string, string> = {

  // ── US Large-Cap Tech ──────────────────────────────────────────────────────
  AAPL:  'Services flywheel (App Store, iCloud, Apple TV+) now >35% of revenue with 75%+ margins. Apple Intelligence AI features are the mid-2025 upgrade cycle catalyst. China exposure (~17% revenue) remains the key geopolitical risk.',
  MSFT:  'Azure AI cloud growing 30%+. Copilot monetization still early innings. OpenAI partnership and enterprise AI distribution are durable competitive advantages.',
  NVDA:  'AI GPU dominance with 80%+ data center share. CUDA ecosystem creates multi-year switching-cost moat. Blackwell GPU demand exceeds supply through 2025.',
  GOOGL: 'Search ad resilience surprises bears. Gemini AI integrated across products. Google Cloud growing 28%+. YouTube Shorts monetization and Waymo commercialization are underappreciated catalysts.',
  META:  'Llama open-source AI strategy paying off. Reality Labs losses narrowing. Advertising targeting improved by AI. Demographic risk (young users) is real but overstated.',
  AMZN:  'AWS cloud margins expanding, advertising growing 20%+, AI infrastructure investment substantial. Retail headwinds masked by AWS/ads profitability acceleration.',
  NFLX:  'Ad-supported tier growing fast. Password-sharing crackdown added 25M+ subscribers. Content spend at scale creates a moat that new entrants cannot easily replicate.',
  AMD:   'Data center GPU momentum (Instinct MI300X) and x86 CPU gains against Intel. AI training/inference market is the growth vector. CUDA moat remains the key competitive barrier against NVIDIA.',
  AVGO:  'VMware acquisition transforms it into a diversified software + chip giant. Custom AI chip business (Google TPU, Meta MTIA) is a multi-year tailwind. High leverage from VMware — watch debt paydown pace.',
  QCOM:  'Smartphone exposure limits near-term growth, but automotive design wins and IoT diversification reduce cyclicality. Arm licensing tension is an ongoing risk.',
  CRM:   'AI CRM (Einstein/Agentforce) is the near-term growth driver. Slack integration still under-monetized. Margin expansion story compelling if revenue growth sustains above 10%.',
  ADBE:  'Figma acquisition blocked by regulators — $1B breakup fee received. Firefly generative AI integrated into Creative Cloud. Creator economy growth is a structural tailwind.',
  ORCL:  'Cloud database migration and AI training partnerships (Microsoft, Google) are transforming the growth profile. Oracle Cloud Infrastructure growing 40%+. Legacy licensing still the majority of revenue.',
  CRWD:  'Falcon platform consolidation is a secular trend — enterprises reducing vendor count. 2024 global outage caused reputation damage but customer retention remained high. Premium valuation demands continued growth.',

  // ── US Large-Cap Financials ────────────────────────────────────────────────
  JPM:   'Best-run US bank — fortress balance sheet, diversified revenue across IB, consumer, and asset management. Rising credit card delinquencies are the watch item. Net interest margin pressure if Fed cuts aggressively.',
  BAC:   'High interest-rate sensitivity gives it more upside than peers in a stable-rate environment. Consumer credit stress and held-to-maturity bond portfolio losses are legacy risks fading over time.',
  GS:    'Investment banking rebound is the primary catalyst — M&A and IPO markets recovering from the 2022-23 drought. Marcus consumer banking pivot failed; refocused on core institutional strengths.',
  MS:    'Wealth management transformation (E*TRADE, Eaton Vance) created more stable, fee-based revenue. Investment banking exposure makes results cyclical. Strong brand in global M&A advisory.',
  V:     'Irreplaceable payments network with 40%+ operating margins and no credit risk. Structural beneficiary of global cash-to-digital transition. Regulatory pressure on interchange fees is the key long-term watch item.',
  MA:    'Near-identical business model to Visa with slightly more international exposure. Both face regulatory pressure on interchange fees. Strong FCF conversion funds consistent buybacks.',
  'BRK-B': 'Buffett\'s $150B+ cash hoard signals few attractive opportunities — patient capital waiting for a crisis. Apple (40%+ of portfolio) is a concentration risk. Insurance float strategy and railroad/utility assets remain exceptional.',
  PYPL:  'Post-peak e-commerce growth challenge. New CEO (Alex Chriss) focused on profitability over growth. Cheap valuation vs. peers but requires strategic re-rating to unlock. Venmo monetization is the sleeper catalyst.',
  SQ:    'Seller ecosystem (point-of-sale hardware/software) and Cash App (peer-to-peer) are complementary flywheels. Bitcoin exposure adds volatility. Path to consistent profitability is the key question.',

  // ── US Healthcare ─────────────────────────────────────────────────────────
  UNH:   'Under DOJ investigation for Medicare billing — near-term overhang. But 20-year EPS CAGR >15%, dominant managed care position, and $370B revenue base remain structurally intact.',
  LLY:   'GLP-1 drugs (Zepbound/Mounjaro) manufacturing capacity ramping fast. Obesity drug TAM estimated $150B+ by 2030. Premium valuation justified by pipeline depth and first-mover manufacturing scale.',
  JNJ:   'Post-talc liability spinoff (Kenvue) cleaned up the balance sheet. MedTech and Innovative Medicine are high-quality segments. Dividend aristocrat — 60+ consecutive years of increases.',
  ABBV:  'Humira patent cliff partially offset by Skyrizi/Rinvoq ramp ahead of expectations. Allergan acquisition diversified beyond immunology. One of the highest dividend yields in large-cap pharma.',
  MRK:   'Keytruda (pembrolizumab) faces patent cliff 2028-2030 — pipeline build-out is existential priority. Daiichi Sankyo ADC partnership and PCSK9 inhibitor in development offer partial mitigation.',
  NVO:   'Wegovy/Ozempic supply constraints easing. Pipeline competition (Eli Lilly, Roche, Pfizer) is real but NVO\'s clinical data and brand advantage are significant. GLP-1 TAM still in very early innings.',
  AZN:   'Oncology pipeline (Enhertu, Tagrisso) is best-in-class globally. US pricing pressure from IRA drug negotiations is a watch item. China revenue exposure (~20%) is a near-term geopolitical overhang.',
  GSK:   'RSV vaccine (Arexvy) and meningitis portfolio are growth drivers. Zantac liability overhang substantially resolved. HIV treatment (Cabenuva) and respiratory pipeline look solid.',
  SNY:   'Dupixent (dupilumab) franchise expanding into new indications including COPD. mRNA oncology pipeline with BioNTech is underappreciated optionality. Diabetes divestiture cleaned up the portfolio.',
  NVS:   'Transformed into pure-play innovative medicine after Sandoz spinoff. Cosentyx biosimilar risk in 2026. Leqvio (inclisiran) cholesterol drug is an underappreciated long-term growth driver.',
  HIMS:  'GLP-1 compounding pharmacy became a massive growth driver in 2024. FDA approval of brand-name drugs vs. compound versions is the key near-term regulatory risk. Telehealth model has strong unit economics.',
  RXRX:  'AI-powered drug discovery — phenomics data platform with Nvidia partnership is a credibility signal. Long path to revenue — currently Phase 1-2 trials. Cash burn means dilution risk is ongoing.',

  // ── US Consumer ───────────────────────────────────────────────────────────
  TSLA:  'Brand sentiment pressure from Musk geopolitics. FSD progress, energy storage growth (Megapack), and Optimus robot optionality are undervalued in current price.',
  WMT:   'Gained significant market share in grocery during inflation. Advertising and marketplace businesses (like Amazon\'s model) are high-margin growth vectors. International (Flipkart, Walmex) underappreciated.',
  COST:  'Membership model creates ultra-loyal, high-renewal revenue stream. Inflation beneficiary as consumers trade down to value. E-commerce growth lagging peers — a long-term watch item.',
  NKE:   'CEO transition + China headwinds + DTC strategy reset. Global brand moat intact — historic dips have been long-term buying opportunities for patient investors.',
  MCD:   'Value menu competition intensifying post-inflation. Franchise model insulates from labor cost inflation. International markets (particularly China) remain meaningful growth engines.',
  SBUX:  'CEO change (Brian Niccol from Chipotle) catalyzed turnaround hopes. China weakness is the near-term overhang — 6,000+ stores in slowing consumer environment. Loyalty program data is undervalued.',
  DIS:   'Streaming turned profitable in 2024. Theme park moat intact. ESPN deal/spinoff is a potential catalyst. Recovering from content cost overspend era.',
  KO:    'Inflation-resistant pricing model with 200+ country distribution moat. Energy drink and sparkling water categories are growth vectors. Long-term risk: GLP-1 drugs reducing sugar consumption.',
  PG:    'Pricing power proved resilient through 2022-24 inflation cycle. Volume recovery underway as consumers adjust to higher shelf prices. EM exposure (Latin America, Asia) adds forex volatility.',

  // ── US Energy ─────────────────────────────────────────────────────────────
  XOM:   'Permian Basin scale and Pioneer acquisition cement top-tier shale position. Integration synergies ahead of plan. Capital discipline improved since 2015 — less capex cyclicality.',
  CVX:   'Hess acquisition adds high-quality Guyana assets. Strong FCF generation, consistent buybacks. Slightly higher international political risk than Exxon. Cheaper valuation vs. peers.',
  COP:   'Premier US independent oil producer — Permian and Alaska positions are top-tier. Marathon Oil acquisition expands scale. Low-cost producer with sub-$40/bbl breakeven makes it resilient.',
  SHEL:  'Integrated energy major with strong LNG trading desk. Transitioning portfolio toward lower-carbon while maintaining hydrocarbon returns. Trading at a discount to US peers.',
  BP:    'Pulling back on renewable energy targets amid shareholder pressure. Upstream oil/gas investments resuming. Activist investor (Elliott) pushing for increased shareholder returns.',
  TTE:   'Best-positioned European major for energy transition — meaningful offshore wind and solar portfolio alongside LNG leadership. Trades at a discount to US energy peers.',

  // ── US Defense ────────────────────────────────────────────────────────────
  LMT:   'F-35 program longevity underpins multi-decade revenue visibility. NATO spending increases are a direct tailwind. Supply chain constraints post-Ukraine are easing.',
  RTX:   'Pratt & Whitney GTF engine powder metal issue (costly inspections) created 2023-24 overhang. Defense portfolio benefits from elevated global threat environment. Backlog at record highs.',
  NOC:   'B-21 Raider stealth bomber is a multi-decade sole-source program — exceptional revenue visibility. Space and cyber defense segments growing faster than legacy platforms.',
  GD:    'Gulfstream business jets have a 3-year backlog — wealth effect durability is underappreciated. Stryker/Abrams demand from NATO allies adds to defense segment growth.',
  RKLB:  'Only pure-play public launch vehicle company. Neutron medium-lift rocket is the next growth lever. Space Systems (satellite components) provides near-term revenue diversification.',

  // ── US Industrials ────────────────────────────────────────────────────────
  BA:    'Quality control scandals and MAX door-plug incident created near-term pain. $500B+ backlog, near-duopoly with Airbus, and defense contracts provide the long-term floor.',
  CAT:   'Infrastructure supercycle (IIJA, CHIPS Act, IRA) is a multi-year tailwind for heavy equipment. China construction slowdown and mining capex cyclicality are the key offsets.',
  HON:   'Portfolio restructuring underway — spinning off Advanced Materials and Automation businesses to unlock value. Defense and process solutions are the higher-quality core segments.',

  // ── US Semiconductors ─────────────────────────────────────────────────────
  TSM:   'Only manufacturer capable of making leading-edge chips at scale (Apple, NVIDIA, AMD are key customers). Arizona fab diversification reduces, but does not eliminate, Taiwan geopolitical risk.',
  MU:    'AI memory (HBM3E) is the structural growth driver — each NVIDIA Blackwell GPU requires 6+ HBM stacks. Cyclical nature of DRAM/NAND means timing the entry matters.',
  ASML:  'Monopoly on EUV lithography — every leading-edge chip requires ASML machines. China export restrictions cut a meaningful revenue segment but order backlog remains >€36B.',

  // ── UK / European ADRs ────────────────────────────────────────────────────
  HSBC:  'Asia-Pacific revenue (~70% of pretax profit) ties it to the China/HK economic cycle. Strategic pivot to wealth management in Asia. Capital return program (buybacks + dividends) is generous.',
  UL:    'New CEO (Hein Schumacher) separating Ice Cream (Ben & Jerry\'s, Magnum) to focus on Power Brands. Emerging market pricing power and volume recovery are underappreciated.',
  RIO:   'World\'s largest iron ore producer — China steel demand is the key swing factor. Copper exposure positions it as a clean energy transition play. Strong FCF and consistent dividend.',
  BHP:   'Diversified mining giant — iron ore, copper, potash. Copper exposure makes it a clean energy transition proxy (EVs, grid). Anglo American acquisition attempt highlighted M&A ambition.',
  SAP:   'ERP cloud migration (S/4HANA Cloud) driving strong recurring revenue growth. AI-embedded enterprise software is the next wave. Trades at a premium valuation vs. US software peers.',
  LVMUY: 'Luxury sector post-Covid demand normalization. China luxury recovery is the key swing factor. Fashion & Leather Goods (Louis Vuitton, Dior) margins are exceptional at scale.',
  SIEGY: 'Industrial automation and digitalization play. Spinoff of Healthineers and Siemens Energy unlocked significant value. Factory automation demand tied to reshoring trends.',
  ABB:   'Electrification and automation are secular growth markets. Data center power demand (transformers, switchgear) is an unexpected tailwind. Strong Swiss quality of earnings.',
  NSRGY: 'Pricing headwinds as volumes decline post-inflation era. Divesting non-core brands to refocus on high-margin products. GLP-1 drugs are a secular headwind to confectionery and snacking.',
  RHHBY: 'Oncology and diagnostics combination creates a uniquely defensible business. Weight-loss drug pipeline (CT-996) could be a major catalyst. Legacy Avastin/Herceptin biosimilar pressure easing.',

  // ── Japan / Asia Pacific ADRs ─────────────────────────────────────────────
  TM:    'World\'s largest automaker with undisputed hybrid dominance (Prius, Camry Hybrid). BEV transition slower than peers — risk if EV mandates accelerate. Solid-state battery development is long-term optionality.',
  SONY:  'PlayStation + entertainment (Sony Pictures, Sony Music) provide diversified revenue beyond gaming. PS5 cycle maturing — PS6 is the next hardware catalyst. Image sensor division (dominant in iPhone cameras) is a hidden gem.',
  SFTBY: 'Masa Son\'s AI-everything bet. ARM Holdings listing was a major value unlock. Vision Fund losses easing. High leverage and concentration in volatile tech assets creates a high-risk/high-reward profile.',
  MUFG:  'Japan\'s largest bank — beneficiary of BOJ rate normalization ending decades of zero-rate policy. TSE shareholder return pressure driving aggressive buybacks. Yen strength is the key earnings risk.',
  BABA:  'China regulatory overhang weighing on valuation. Trading at 8-10x earnings with cloud growing and buybacks accelerating. Key risk = US-China trade and technology tensions.',
  TCEHY: 'WeChat/WeiXin superapp monetization and gaming recovery post-China regulatory thaw. Hunyuan AI LLM investments are early-stage. US political risk — potential forced divestment concerns persist.',
  SSNLF: 'Memory + smartphone + display + foundry unique diversification. HBM competition with SK Hynix intensifying. Samsung Foundry is struggling vs. TSMC — a multi-year challenge to fix.',
  INFY:  'India\'s second-largest IT services firm. AI-led digital transformation programs are driving large deal wins. Attrition normalizing. US visa/immigration policies affect the delivery model.',
  HDB:   'India\'s largest private bank — riding India\'s formalization of economy and credit expansion. HDFC Ltd. merger integration risk largely resolved. Premium valuation vs. state banks justified by superior asset quality.',

  // ── EV & Clean Energy ─────────────────────────────────────────────────────
  RIVN:  'Cash burn improving, Volkswagen partnership adds credibility. Amazon delivery van contract provides a revenue floor. Long road to profitability but strategic value as an EV platform is clear.',
  NIO:   'China\'s premium EV brand. ONVO (lower-cost sub-brand) addresses the mass market. Battery swap network is a genuine differentiator vs. Tesla. Cash burn remains high; ongoing dilution risk.',
  XPEV:  'MONA and X9 models gaining traction in China. NVIDIA partnership for next-gen ADAS is a positive signal. Government subsidy dependency and intense domestic EV competition are key risks.',
  ENPH:  'Residential solar market slowdown due to high interest rates and California NEM 3.0 reform. IQ8 microinverter technology remains class-leading. Recovery trajectory tied to Fed rate cuts.',
  CHPT:  'EV charging network leader facing margin pressure from hardware commoditization. Software/services revenue is higher quality. Federal NEVI infrastructure funding is a multi-year tailwind.',

  // ── Crypto & Digital Assets ───────────────────────────────────────────────
  COIN:  'Dominant US crypto exchange — revenue highly correlated to Bitcoin price and trading volumes. Fee compression risk from competition. Key beneficiary of a crypto-friendly regulatory environment.',
  MSTR:  'Michael Saylor\'s Bitcoin acquisition vehicle — holds 200,000+ BTC funded by convertible notes. Acts as leveraged Bitcoin exposure with additional operational risk. Not a substitute for direct BTC.',
  MARA:  'Pure-play Bitcoin miner with a large Bitcoin treasury strategy. Hash rate growth requires significant capex. High correlation to Bitcoin price — a high-beta proxy for the crypto cycle.',
  RIOT:  'Bitcoin mining focused on Texas data center operations. Energy cost management is the key margin lever. Second-order Bitcoin play behind MSTR in terms of price sensitivity.',

  // ── AI & Cloud Software ───────────────────────────────────────────────────
  PLTR:  'US government AI contracts (Maven, Gotham) are high-margin recurring revenue. AIP commercial adoption accelerating into enterprise. Premium 70x+ revenue multiple prices in near-perfection.',
  DDOG:  'Observability and security platform consolidation is secular. Rule-of-40 metrics (growth + margin) best-in-class among mid-cap software. Multiple compression risk if growth falls below 25%.',
  SNOW:  'Data cloud platform well-positioned for AI workloads. CEO change (Sridhar Ramaswamy) shifted strategy toward AI. Path to profitability at scale is the key question for long-term holders.',
  PATH:  'Robotic process automation (RPA) market leader facing disruption from AI agents that can complete tasks without explicit programming. AI co-pilot additions are defensive positioning.',
  AI:    'Enterprise AI software with US government contracts. Revenue model shift from subscription to consumption-based created near-term uncertainty. Baker Hughes partnership is a notable commercial anchor.',

  // ── Fintech & Payments ────────────────────────────────────────────────────
  HOOD:  'Retail trading platform with 23M+ funded accounts. Options and crypto trading are the highest-margin revenue streams. Regulatory risk (payment for order flow) and cyclical revenue model are key risks.',
  SOFI:  'Banking charter (obtained 2022) improves unit economics vs. fintech-only peers. Student loan refinancing headwinds from forgiveness policy uncertainty. Strong cross-sell of multiple financial products.',
  AFRM:  'BNPL market leader but faces rising delinquency risk as consumer credit normalizes. Apple Pay Later shutdown was a competitive relief. Zero-interest deals with merchants are volume drivers.',
  UPST:  'AI-powered personal loan origination — model performs differently across credit cycles. Macro sensitivity (rates, unemployment) creates volatile revenue. Funding partner concentration is a structural risk.',

  // ── AI Speculative ────────────────────────────────────────────────────────
  SMCI:  'Accounting restatement concerns created significant overhang. AI server demand is real and margins improving. High risk/reward — small position size appropriate given governance uncertainty.',
  APLD:  'Pure-play AI data center operator. Revenue growing fast but not yet profitable. Sensitive to power costs and GPU availability — a classic high-risk swing trade setup.',
  IONQ:  'Trapped-ion quantum computing approach may have long-term fidelity advantage over superconducting qubits. Commercial use cases still very early. Government contracts provide near-term revenue floor.',
  SOUN:  'Voice AI for automotive and enterprise (McDonald\'s, Stellantis design wins). Small revenue base means growth % looks impressive but absolute numbers remain modest. High sentiment/speculative stock.',
  BBAI:  'AI decision intelligence for national security customers. Revenue growth has been inconsistent. Small float creates high volatility. Speculative hold — needs contract expansion to justify valuation.',

  // ── Commodities / ETFs ────────────────────────────────────────────────────
  GLD:   'Gold ETF tracking spot price. Beneficiary of rate cut cycles, USD weakness, and geopolitical risk. Central bank gold buying (EM countries diversifying reserves) is a structural demand tailwind.',
  SLV:   'Silver ETF with dual demand — monetary safe haven + industrial use (solar panels, EV batteries, electronics). Higher beta than gold; outperforms in strong commodity bull markets.',
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

/**
 * 7-criteria fundamental health score — identical to the Watchlist scoring.
 *
 * 1. ROE ≥ 15%          — Buffett's capital efficiency threshold
 * 2. Revenue Growth ≥ 10% — Healthy top-line expansion (revenueGrowth is stored as decimal)
 * 3. Op Margin ≥ 10%    — Efficient operations before interest/tax
 * 4. Net Margin ≥ 8%    — Profitable after all costs (profitMargin stored as decimal)
 * 5. Debt/Equity ≤ 100% — Conservative leverage (100 = 1.0x D/E in Finnhub units)
 * 6. Current Ratio ≥ 1.5 — Graham's liquidity standard
 * 7. Cash Flow/Share > 0 — Positive free cash generation
 *
 * Score 5–7 → Strong · 3–4 → Moderate · 0–2 → Weak
 * Requires ≥ 3 data points; otherwise returns Unknown.
 */
export function getFundamentalHealth(rec: Recommendation): {
  label: 'Strong' | 'Moderate' | 'Weak' | 'Unknown';
  color: string;
  score: number;
  max: number;
  breakdown: { label: string; pass: boolean | null }[];
} {
  const breakdown: { label: string; pass: boolean | null }[] = [
    {
      label: `ROE ≥ 15% (${rec.roeTTM != null ? rec.roeTTM.toFixed(1) + '%' : '—'})`,
      pass: rec.roeTTM != null ? rec.roeTTM >= 15 : null,
    },
    {
      label: `Rev Growth ≥ 10% (${rec.revenueGrowth != null ? (rec.revenueGrowth * 100).toFixed(1) + '%' : '—'})`,
      pass: rec.revenueGrowth != null ? rec.revenueGrowth >= 0.10 : null,
    },
    {
      label: `Op Margin ≥ 10% (${rec.operatingMargin != null ? rec.operatingMargin.toFixed(1) + '%' : '—'})`,
      pass: rec.operatingMargin != null ? rec.operatingMargin >= 10 : null,
    },
    {
      label: `Net Margin ≥ 8% (${rec.profitMargin != null ? (rec.profitMargin * 100).toFixed(1) + '%' : '—'})`,
      pass: rec.profitMargin != null ? rec.profitMargin >= 0.08 : null,
    },
    {
      label: `Debt/Equity ≤ 1.0x (${rec.debtToEquity != null ? (rec.debtToEquity / 100).toFixed(2) + 'x' : '—'})`,
      pass: rec.debtToEquity != null ? rec.debtToEquity <= 100 : null,
    },
    {
      label: `Current Ratio ≥ 1.5 (${rec.currentRatio != null ? rec.currentRatio.toFixed(2) : '—'})`,
      pass: rec.currentRatio != null ? rec.currentRatio >= 1.5 : null,
    },
    {
      label: `Cash Flow/Share > 0 (${rec.cashFlowPerShare != null ? '$' + rec.cashFlowPerShare.toFixed(2) : '—'})`,
      pass: rec.cashFlowPerShare != null ? rec.cashFlowPerShare > 0 : null,
    },
  ];

  const available = breakdown.filter((c) => c.pass !== null);
  if (available.length < 3) {
    return { label: 'Unknown', color: 'text-gray-500', score: 0, max: 0, breakdown };
  }

  const score = available.filter((c) => c.pass === true).length;
  const max   = available.length;

  if (score >= 5) return { label: 'Strong',   color: 'text-emerald-400', score, max, breakdown };
  if (score >= 3) return { label: 'Moderate', color: 'text-amber-400',   score, max, breakdown };
  return               { label: 'Weak',     color: 'text-red-400',     score, max, breakdown };
}
