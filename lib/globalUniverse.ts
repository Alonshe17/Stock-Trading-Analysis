import type { StockCategory } from './trendAnalysis';

export type StockMeta = {
  symbol: string;
  name: string;
  sector: string;
  exchange: string;
  currency: string;
  category?: StockCategory;
};

export const US_REC_STOCKS: StockMeta[] = [
  { symbol: 'AAPL',  name: 'Apple',                     sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'E-Commerce & Tech' },
  { symbol: 'MSFT',  name: 'Microsoft',                  sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'NVDA',  name: 'NVIDIA',                     sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'Semiconductors' },
  { symbol: 'AMZN',  name: 'Amazon',                     sector: 'Consumer Cyclical',      exchange: 'NASDAQ', currency: 'USD', category: 'E-Commerce & Tech' },
  { symbol: 'GOOGL', name: 'Alphabet',                   sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'META',  name: 'Meta Platforms',             sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'TSLA',  name: 'Tesla',                      sector: 'Consumer Cyclical',      exchange: 'NASDAQ', currency: 'USD', category: 'EV & Clean Energy' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',     sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'Semiconductors' },
  { symbol: 'AVGO',  name: 'Broadcom',                   sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'Semiconductors' },
  { symbol: 'QCOM',  name: 'Qualcomm',                   sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'Semiconductors' },
  { symbol: 'JPM',   name: 'JPMorgan Chase',             sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD', category: 'Banking & Finance' },
  { symbol: 'BAC',   name: 'Bank of America',            sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD', category: 'Banking & Finance' },
  { symbol: 'GS',    name: 'Goldman Sachs',              sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD', category: 'Banking & Finance' },
  { symbol: 'V',     name: 'Visa',                       sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD', category: 'Payments & Fintech' },
  { symbol: 'MA',    name: 'Mastercard',                 sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD', category: 'Payments & Fintech' },
  { symbol: 'UNH',   name: 'UnitedHealth Group',         sector: 'Healthcare',             exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'JNJ',   name: 'Johnson & Johnson',          sector: 'Healthcare',             exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'LLY',   name: 'Eli Lilly',                  sector: 'Healthcare',             exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'ABBV',  name: 'AbbVie',                     sector: 'Healthcare',             exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'WMT',   name: 'Walmart',                    sector: 'Consumer Defensive',     exchange: 'NYSE',   currency: 'USD', category: 'Consumer Defensive' },
  { symbol: 'COST',  name: 'Costco',                     sector: 'Consumer Defensive',     exchange: 'NASDAQ', currency: 'USD', category: 'Consumer Defensive' },
  { symbol: 'NKE',   name: 'Nike',                       sector: 'Consumer Cyclical',      exchange: 'NYSE',   currency: 'USD', category: 'Consumer Cyclical' },
  { symbol: 'XOM',   name: 'ExxonMobil',                 sector: 'Energy',                 exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },
  { symbol: 'CVX',   name: 'Chevron',                    sector: 'Energy',                 exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway',         sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD', category: 'Banking & Finance' },
  { symbol: 'NFLX',  name: 'Netflix',                    sector: 'Communication Services', exchange: 'NASDAQ', currency: 'USD', category: 'E-Commerce & Tech' },
  { symbol: 'CRM',   name: 'Salesforce',                 sector: 'Technology',             exchange: 'NYSE',   currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'ADBE',  name: 'Adobe',                      sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'ORCL',  name: 'Oracle',                     sector: 'Technology',             exchange: 'NYSE',   currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'DIS',   name: 'Walt Disney',                sector: 'Communication Services', exchange: 'NYSE',   currency: 'USD', category: 'Consumer Cyclical' },
  // Defense & Aerospace
  { symbol: 'LMT',   name: 'Lockheed Martin',            sector: 'Defense',                exchange: 'NYSE',   currency: 'USD', category: 'Defense & Aerospace' },
  { symbol: 'RTX',   name: 'RTX Corp',                   sector: 'Defense',                exchange: 'NYSE',   currency: 'USD', category: 'Defense & Aerospace' },
  { symbol: 'NOC',   name: 'Northrop Grumman',           sector: 'Defense',                exchange: 'NYSE',   currency: 'USD', category: 'Defense & Aerospace' },
  { symbol: 'GD',    name: 'General Dynamics',           sector: 'Defense',                exchange: 'NYSE',   currency: 'USD', category: 'Defense & Aerospace' },
  { symbol: 'BA',    name: 'Boeing',                     sector: 'Industrials',            exchange: 'NYSE',   currency: 'USD', category: 'Industrials' },
  // Healthcare
  { symbol: 'MRK',   name: 'Merck',                      sector: 'Healthcare',             exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  // Finance
  { symbol: 'MS',    name: 'Morgan Stanley',             sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD', category: 'Banking & Finance' },
  // Industrials
  { symbol: 'CAT',   name: 'Caterpillar',                sector: 'Industrials',            exchange: 'NYSE',   currency: 'USD', category: 'Industrials' },
  { symbol: 'HON',   name: 'Honeywell',                  sector: 'Industrials',            exchange: 'NASDAQ', currency: 'USD', category: 'Industrials' },
  // Consumer Defensive
  { symbol: 'PG',    name: 'Procter & Gamble',           sector: 'Consumer Defensive',     exchange: 'NYSE',   currency: 'USD', category: 'Consumer Defensive' },
  { symbol: 'KO',    name: 'Coca-Cola',                  sector: 'Consumer Defensive',     exchange: 'NYSE',   currency: 'USD', category: 'Consumer Defensive' },
  // Consumer Cyclical
  { symbol: 'MCD',   name: "McDonald's",                 sector: 'Consumer Cyclical',      exchange: 'NYSE',   currency: 'USD', category: 'Consumer Cyclical' },
  { symbol: 'SBUX',  name: 'Starbucks',                  sector: 'Consumer Cyclical',      exchange: 'NASDAQ', currency: 'USD', category: 'Consumer Cyclical' },
  // Healthcare ADR
  { symbol: 'NVO',   name: 'Novo Nordisk ADR',           sector: 'Healthcare',             exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  // Technology ADR/US
  { symbol: 'TSM',   name: 'Taiwan Semiconductor ADR',   sector: 'Technology',             exchange: 'NYSE',   currency: 'USD', category: 'Semiconductors' },
  { symbol: 'MU',    name: 'Micron Technology',          sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'Semiconductors' },
  { symbol: 'CRWD',  name: 'CrowdStrike',                sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'AI & Cloud' },
  // Payments & Fintech
  { symbol: 'PYPL',  name: 'PayPal',                     sector: 'Financial Services',     exchange: 'NASDAQ', currency: 'USD', category: 'Payments & Fintech' },
  { symbol: 'SQ',    name: 'Block',                      sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD', category: 'Payments & Fintech' },
  // Energy
  { symbol: 'COP',   name: 'ConocoPhillips',             sector: 'Energy',                 exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },
  // Clean Energy
  { symbol: 'ENPH',  name: 'Enphase Energy',             sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'EV & Clean Energy' },
];

/**
 * ASIA_STOCKS — all local-exchange tickers replaced with US-listed ADRs (NYSE/NASDAQ)
 * or liquid OTC ADRs so that Finnhub analyst consensus data is available.
 */
export const ASIA_STOCKS: StockMeta[] = [
  // Japan — US ADRs
  { symbol: 'TM',     name: 'Toyota Motor ADR',          sector: 'Consumer Cyclical',      exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'SONY',   name: 'Sony Group ADR',            sector: 'Technology',             exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'SFTBY',  name: 'SoftBank Group ADR',        sector: 'Technology',             exchange: 'OTC',    currency: 'USD' },
  { symbol: 'KYCCF',  name: 'Keyence ADR',               sector: 'Technology',             exchange: 'OTC',    currency: 'USD' },
  { symbol: 'DKILY',  name: 'Daikin Industries ADR',     sector: 'Industrials',            exchange: 'OTC',    currency: 'USD' },
  { symbol: 'MUFG',   name: 'Mitsubishi UFJ Financial',  sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'HTHIY',  name: 'Hitachi ADR',               sector: 'Industrials',            exchange: 'OTC',    currency: 'USD' },
  { symbol: 'NTTYY',  name: 'NTT ADR',                   sector: 'Communication Services', exchange: 'OTC',    currency: 'USD' },
  { symbol: 'DNZOY',  name: 'DENSO ADR',                 sector: 'Consumer Cyclical',      exchange: 'OTC',    currency: 'USD' },
  // China / Hong Kong — US ADRs
  { symbol: 'TCEHY',  name: 'Tencent Holdings ADR',      sector: 'Technology',             exchange: 'OTC',    currency: 'USD' },
  { symbol: 'BABA',   name: 'Alibaba Group',             sector: 'Consumer Cyclical',      exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'MPNGY',  name: 'Meituan ADR',               sector: 'Consumer Cyclical',      exchange: 'OTC',    currency: 'USD' },
  { symbol: 'XIACY',  name: 'Xiaomi ADR',                sector: 'Technology',             exchange: 'OTC',    currency: 'USD' },
  { symbol: 'CHMXY',  name: 'China Mobile ADR',          sector: 'Communication Services', exchange: 'OTC',    currency: 'USD' },
  { symbol: 'PNGAY',  name: 'Ping An Insurance ADR',     sector: 'Financial Services',     exchange: 'OTC',    currency: 'USD' },
  { symbol: 'HSBC',   name: 'HSBC Holdings ADR',         sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD' },
  // Korea — OTC ADRs
  { symbol: 'SSNLF',  name: 'Samsung Electronics ADR',   sector: 'Technology',             exchange: 'OTC',    currency: 'USD' },
  { symbol: 'HXSCL',  name: 'SK Hynix ADR',              sector: 'Technology',             exchange: 'OTC',    currency: 'USD' },
  { symbol: 'HYMTF',  name: 'Hyundai Motor ADR',         sector: 'Consumer Cyclical',      exchange: 'OTC',    currency: 'USD' },
  // Singapore — OTC ADRs
  { symbol: 'DBSDY',  name: 'DBS Group ADR',             sector: 'Financial Services',     exchange: 'OTC',    currency: 'USD' },
  { symbol: 'OVCHY',  name: 'OCBC Bank ADR',             sector: 'Financial Services',     exchange: 'OTC',    currency: 'USD' },
  { symbol: 'UOVEY',  name: 'UOB ADR',                   sector: 'Financial Services',     exchange: 'OTC',    currency: 'USD' },
  // Australia — US ADRs
  { symbol: 'CBAUF',  name: 'Commonwealth Bank ADR',     sector: 'Financial Services',     exchange: 'OTC',    currency: 'USD' },
  { symbol: 'BHP',    name: 'BHP Group ADR',             sector: 'Basic Materials',        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'CSLLY',  name: 'CSL Limited ADR',           sector: 'Healthcare',             exchange: 'OTC',    currency: 'USD' },
  // India — US ADRs
  { symbol: 'RLNIY',  name: 'Reliance Industries ADR',   sector: 'Energy',                 exchange: 'OTC',    currency: 'USD' },
  { symbol: 'TCSYY',  name: 'Tata Consultancy ADR',      sector: 'Technology',             exchange: 'OTC',    currency: 'USD' },
  { symbol: 'INFY',   name: 'Infosys ADR',               sector: 'Technology',             exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'HDB',    name: 'HDFC Bank ADR',             sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD' },
];

/**
 * EUR_UK_STOCKS — all local-exchange tickers (LSE .L, XETRA .DE, Euronext .PA/.AS, SIX .SW)
 * replaced with US-listed ADRs so that Finnhub analyst consensus data is available.
 */
export const EUR_UK_STOCKS: StockMeta[] = [
  // UK — NYSE/NASDAQ-listed ADRs
  { symbol: 'SHEL',   name: 'Shell ADR',               sector: 'Energy',                 exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },
  { symbol: 'AZN',    name: 'AstraZeneca ADR',         sector: 'Healthcare',             exchange: 'NASDAQ', currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'HSBC',   name: 'HSBC Holdings ADR',       sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'BP',     name: 'BP ADR',                  sector: 'Energy',                 exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },
  { symbol: 'RIO',    name: 'Rio Tinto ADR',           sector: 'Basic Materials',        exchange: 'NYSE',   currency: 'USD' },
  { symbol: 'UL',     name: 'Unilever ADR',            sector: 'Consumer Defensive',     exchange: 'NYSE',   currency: 'USD', category: 'Consumer Defensive' },
  { symbol: 'GSK',    name: 'GSK ADR',                 sector: 'Healthcare',             exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'BCS',    name: 'Barclays ADR',            sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD', category: 'Banking & Finance' },
  { symbol: 'LYG',    name: 'Lloyds Banking ADR',      sector: 'Financial Services',     exchange: 'NYSE',   currency: 'USD', category: 'Banking & Finance' },
  { symbol: 'RELX',   name: 'RELX ADR',                sector: 'Communication Services', exchange: 'NYSE',   currency: 'USD' },
  // Germany — NYSE-listed ADR / liquid OTC
  { symbol: 'SAP',    name: 'SAP ADR',                 sector: 'Technology',             exchange: 'NYSE',   currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'SIEGY',  name: 'Siemens ADR',             sector: 'Industrials',            exchange: 'OTC',    currency: 'USD', category: 'Industrials' },
  { symbol: 'ALIZY',  name: 'Allianz ADR',             sector: 'Financial Services',     exchange: 'OTC',    currency: 'USD', category: 'Banking & Finance' },
  { symbol: 'BAYRY',  name: 'Bayer ADR',               sector: 'Healthcare',             exchange: 'OTC',    currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'MBGAF',  name: 'Mercedes-Benz ADR',       sector: 'Consumer Cyclical',      exchange: 'OTC',    currency: 'USD', category: 'EV & Clean Energy' },
  { symbol: 'DTEGY',  name: 'Deutsche Telekom ADR',    sector: 'Communication Services', exchange: 'OTC',    currency: 'USD' },
  // France — NYSE/NASDAQ-listed ADR / liquid OTC
  { symbol: 'LVMUY',  name: 'LVMH ADR',               sector: 'Consumer Cyclical',      exchange: 'OTC',    currency: 'USD', category: 'Consumer Cyclical' },
  { symbol: 'LRLCY',  name: "L'Oreal ADR",            sector: 'Consumer Defensive',     exchange: 'OTC',    currency: 'USD', category: 'Consumer Defensive' },
  { symbol: 'SNY',    name: 'Sanofi ADR',              sector: 'Healthcare',             exchange: 'NASDAQ', currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'BNPQY',  name: 'BNP Paribas ADR',        sector: 'Financial Services',     exchange: 'OTC',    currency: 'USD', category: 'Banking & Finance' },
  { symbol: 'EADSY',  name: 'Airbus ADR',              sector: 'Industrials',            exchange: 'OTC',    currency: 'USD', category: 'Defense & Aerospace' },
  { symbol: 'TTE',    name: 'TotalEnergies ADR',       sector: 'Energy',                 exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },
  // Netherlands — NASDAQ-listed
  { symbol: 'ASML',   name: 'ASML Holding',            sector: 'Technology',             exchange: 'NASDAQ', currency: 'USD', category: 'Semiconductors' },
  // Switzerland — NYSE-listed ADR / liquid OTC
  { symbol: 'NSRGY',  name: 'Nestle ADR',              sector: 'Consumer Defensive',     exchange: 'OTC',    currency: 'USD', category: 'Consumer Defensive' },
  { symbol: 'RHHBY',  name: 'Roche Holding ADR',       sector: 'Healthcare',             exchange: 'OTC',    currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'NVS',    name: 'Novartis ADR',            sector: 'Healthcare',             exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'ABB',    name: 'ABB Ltd ADR',             sector: 'Industrials',            exchange: 'NYSE',   currency: 'USD', category: 'Industrials' },
];

export const GROWTH_STOCKS: StockMeta[] = [
  { symbol: 'APLD',  name: 'Applied Digital',          sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'AI Speculative' },
  { symbol: 'SMCI',  name: 'Super Micro Computer',     sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'AI Speculative' },
  { symbol: 'IONQ',  name: 'IonQ',                     sector: 'Technology',         exchange: 'NYSE',   currency: 'USD', category: 'AI Speculative' },
  { symbol: 'RKLB',  name: 'Rocket Lab',               sector: 'Industrials',        exchange: 'NASDAQ', currency: 'USD', category: 'Defense & Aerospace' },
  { symbol: 'SOUN',  name: 'SoundHound AI',            sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'AI Speculative' },
  { symbol: 'BBAI',  name: 'BigBear.ai',               sector: 'Technology',         exchange: 'NYSE',   currency: 'USD', category: 'AI Speculative' },
  { symbol: 'PLTR',  name: 'Palantir Technologies',    sector: 'Technology',         exchange: 'NYSE',   currency: 'USD', category: 'AI Speculative' },
  { symbol: 'HOOD',  name: 'Robinhood Markets',        sector: 'Financial Services', exchange: 'NASDAQ', currency: 'USD', category: 'Payments & Fintech' },
  { symbol: 'SOFI',  name: 'SoFi Technologies',        sector: 'Financial Services', exchange: 'NASDAQ', currency: 'USD', category: 'Payments & Fintech' },
  { symbol: 'AFRM',  name: 'Affirm Holdings',          sector: 'Financial Services', exchange: 'NASDAQ', currency: 'USD', category: 'Payments & Fintech' },
  { symbol: 'UPST',  name: 'Upstart Holdings',         sector: 'Financial Services', exchange: 'NASDAQ', currency: 'USD', category: 'Payments & Fintech' },
  { symbol: 'COIN',  name: 'Coinbase Global',          sector: 'Financial Services', exchange: 'NASDAQ', currency: 'USD', category: 'Crypto & Digital Assets' },
  { symbol: 'HIMS',  name: 'Hims & Hers Health',       sector: 'Healthcare',         exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'RIVN',  name: 'Rivian Automotive',        sector: 'Consumer Cyclical',  exchange: 'NASDAQ', currency: 'USD', category: 'EV & Clean Energy' },
  { symbol: 'NIO',   name: 'NIO',                      sector: 'Consumer Cyclical',  exchange: 'NYSE',   currency: 'USD', category: 'EV & Clean Energy' },
  { symbol: 'XPEV',  name: 'XPeng',                   sector: 'Consumer Cyclical',  exchange: 'NYSE',   currency: 'USD', category: 'EV & Clean Energy' },
  { symbol: 'MARA',  name: 'Marathon Digital',         sector: 'Financial Services', exchange: 'NASDAQ', currency: 'USD', category: 'Crypto & Digital Assets' },
  { symbol: 'RIOT',  name: 'Riot Platforms',           sector: 'Financial Services', exchange: 'NASDAQ', currency: 'USD', category: 'Crypto & Digital Assets' },
  { symbol: 'MSTR',  name: 'MicroStrategy',            sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'Crypto & Digital Assets' },
  { symbol: 'AI',    name: 'C3.ai',                    sector: 'Technology',         exchange: 'NYSE',   currency: 'USD', category: 'AI Speculative' },
  { symbol: 'PATH',  name: 'UiPath',                   sector: 'Technology',         exchange: 'NYSE',   currency: 'USD', category: 'AI Speculative' },
  { symbol: 'DDOG',  name: 'Datadog',                  sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'SNOW',  name: 'Snowflake',                sector: 'Technology',         exchange: 'NYSE',   currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'RXRX',  name: 'Recursion Pharmaceuticals', sector: 'Healthcare',        exchange: 'NASDAQ', currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'CHPT',  name: 'ChargePoint Holdings',     sector: 'Industrials',        exchange: 'NYSE',   currency: 'USD', category: 'EV & Clean Energy' },
];

/**
 * TREND_UNIVERSE — curated list of ~65 stocks covering all 14 categories.
 * Used by the /trends page. All non-US symbols replaced with US ADRs for
 * consistent Finnhub analyst consensus coverage.
 */
export const TREND_UNIVERSE: StockMeta[] = [
  // ── Defense & Aerospace ───────────────────────────────────────────────────
  { symbol: 'LMT',   name: 'Lockheed Martin',          sector: 'Defense',            exchange: 'NYSE',   currency: 'USD', category: 'Defense & Aerospace' },
  { symbol: 'RTX',   name: 'RTX Corp',                 sector: 'Defense',            exchange: 'NYSE',   currency: 'USD', category: 'Defense & Aerospace' },
  { symbol: 'NOC',   name: 'Northrop Grumman',         sector: 'Defense',            exchange: 'NYSE',   currency: 'USD', category: 'Defense & Aerospace' },
  { symbol: 'GD',    name: 'General Dynamics',         sector: 'Defense',            exchange: 'NYSE',   currency: 'USD', category: 'Defense & Aerospace' },
  { symbol: 'RKLB',  name: 'Rocket Lab',               sector: 'Industrials',        exchange: 'NASDAQ', currency: 'USD', category: 'Defense & Aerospace' },

  // ── Semiconductors ────────────────────────────────────────────────────────
  { symbol: 'NVDA',  name: 'NVIDIA',                   sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'Semiconductors' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',   sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'Semiconductors' },
  { symbol: 'AVGO',  name: 'Broadcom',                 sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'Semiconductors' },
  { symbol: 'TSM',   name: 'Taiwan Semiconductor ADR', sector: 'Technology',         exchange: 'NYSE',   currency: 'USD', category: 'Semiconductors' },
  { symbol: 'MU',    name: 'Micron Technology',        sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'Semiconductors' },
  { symbol: 'ASML',  name: 'ASML Holding',             sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'Semiconductors' },

  // ── AI & Cloud ────────────────────────────────────────────────────────────
  { symbol: 'MSFT',  name: 'Microsoft',                sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'GOOGL', name: 'Alphabet',                 sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'META',  name: 'Meta Platforms',           sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'CRWD',  name: 'CrowdStrike',              sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'ORCL',  name: 'Oracle',                   sector: 'Technology',         exchange: 'NYSE',   currency: 'USD', category: 'AI & Cloud' },
  { symbol: 'DDOG',  name: 'Datadog',                  sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'AI & Cloud' },

  // ── Healthcare & Pharma ───────────────────────────────────────────────────
  { symbol: 'LLY',   name: 'Eli Lilly',                sector: 'Healthcare',         exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'NVO',   name: 'Novo Nordisk ADR',         sector: 'Healthcare',         exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'UNH',   name: 'UnitedHealth Group',       sector: 'Healthcare',         exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'ABBV',  name: 'AbbVie',                   sector: 'Healthcare',         exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'MRK',   name: 'Merck',                    sector: 'Healthcare',         exchange: 'NYSE',   currency: 'USD', category: 'Healthcare & Pharma' },
  { symbol: 'AZN',   name: 'AstraZeneca ADR',          sector: 'Healthcare',         exchange: 'NASDAQ', currency: 'USD', category: 'Healthcare & Pharma' },

  // ── Energy & Oil ──────────────────────────────────────────────────────────
  { symbol: 'XOM',   name: 'ExxonMobil',               sector: 'Energy',             exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },
  { symbol: 'CVX',   name: 'Chevron',                  sector: 'Energy',             exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },
  { symbol: 'COP',   name: 'ConocoPhillips',           sector: 'Energy',             exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },
  { symbol: 'SHEL',  name: 'Shell ADR',                sector: 'Energy',             exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },

  // ── Banking & Finance ─────────────────────────────────────────────────────
  { symbol: 'JPM',   name: 'JPMorgan Chase',           sector: 'Financial Services', exchange: 'NYSE',   currency: 'USD', category: 'Banking & Finance' },
  { symbol: 'GS',    name: 'Goldman Sachs',            sector: 'Financial Services', exchange: 'NYSE',   currency: 'USD', category: 'Banking & Finance' },
  { symbol: 'MS',    name: 'Morgan Stanley',           sector: 'Financial Services', exchange: 'NYSE',   currency: 'USD', category: 'Banking & Finance' },
  { symbol: 'BAC',   name: 'Bank of America',          sector: 'Financial Services', exchange: 'NYSE',   currency: 'USD', category: 'Banking & Finance' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway',       sector: 'Financial Services', exchange: 'NYSE',   currency: 'USD', category: 'Banking & Finance' },

  // ── Payments & Fintech ────────────────────────────────────────────────────
  { symbol: 'V',     name: 'Visa',                     sector: 'Financial Services', exchange: 'NYSE',   currency: 'USD', category: 'Payments & Fintech' },
  { symbol: 'MA',    name: 'Mastercard',               sector: 'Financial Services', exchange: 'NYSE',   currency: 'USD', category: 'Payments & Fintech' },
  { symbol: 'PYPL',  name: 'PayPal',                   sector: 'Financial Services', exchange: 'NASDAQ', currency: 'USD', category: 'Payments & Fintech' },
  { symbol: 'SQ',    name: 'Block',                    sector: 'Financial Services', exchange: 'NYSE',   currency: 'USD', category: 'Payments & Fintech' },
  { symbol: 'COIN',  name: 'Coinbase Global',          sector: 'Financial Services', exchange: 'NASDAQ', currency: 'USD', category: 'Payments & Fintech' },

  // ── Consumer Defensive ────────────────────────────────────────────────────
  { symbol: 'WMT',   name: 'Walmart',                  sector: 'Consumer Defensive', exchange: 'NYSE',   currency: 'USD', category: 'Consumer Defensive' },
  { symbol: 'COST',  name: 'Costco',                   sector: 'Consumer Defensive', exchange: 'NASDAQ', currency: 'USD', category: 'Consumer Defensive' },
  { symbol: 'PG',    name: 'Procter & Gamble',         sector: 'Consumer Defensive', exchange: 'NYSE',   currency: 'USD', category: 'Consumer Defensive' },
  { symbol: 'KO',    name: 'Coca-Cola',                sector: 'Consumer Defensive', exchange: 'NYSE',   currency: 'USD', category: 'Consumer Defensive' },

  // ── Consumer Cyclical ─────────────────────────────────────────────────────
  { symbol: 'NKE',   name: 'Nike',                     sector: 'Consumer Cyclical',  exchange: 'NYSE',   currency: 'USD', category: 'Consumer Cyclical' },
  { symbol: 'MCD',   name: "McDonald's",               sector: 'Consumer Cyclical',  exchange: 'NYSE',   currency: 'USD', category: 'Consumer Cyclical' },
  { symbol: 'SBUX',  name: 'Starbucks',                sector: 'Consumer Cyclical',  exchange: 'NASDAQ', currency: 'USD', category: 'Consumer Cyclical' },
  { symbol: 'DIS',   name: 'Walt Disney',              sector: 'Communication Services', exchange: 'NYSE', currency: 'USD', category: 'Consumer Cyclical' },
  { symbol: 'NFLX',  name: 'Netflix',                  sector: 'Communication Services', exchange: 'NASDAQ', currency: 'USD', category: 'Consumer Cyclical' },

  // ── EV & Clean Energy ─────────────────────────────────────────────────────
  { symbol: 'TSLA',  name: 'Tesla',                    sector: 'Consumer Cyclical',  exchange: 'NASDAQ', currency: 'USD', category: 'EV & Clean Energy' },
  { symbol: 'RIVN',  name: 'Rivian Automotive',        sector: 'Consumer Cyclical',  exchange: 'NASDAQ', currency: 'USD', category: 'EV & Clean Energy' },
  { symbol: 'ENPH',  name: 'Enphase Energy',           sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'EV & Clean Energy' },
  { symbol: 'NIO',   name: 'NIO',                      sector: 'Consumer Cyclical',  exchange: 'NYSE',   currency: 'USD', category: 'EV & Clean Energy' },
  { symbol: 'CHPT',  name: 'ChargePoint Holdings',     sector: 'Industrials',        exchange: 'NYSE',   currency: 'USD', category: 'EV & Clean Energy' },

  // ── Crypto & Digital Assets ───────────────────────────────────────────────
  { symbol: 'MSTR',  name: 'MicroStrategy',            sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'Crypto & Digital Assets' },
  { symbol: 'MARA',  name: 'Marathon Digital',         sector: 'Financial Services', exchange: 'NASDAQ', currency: 'USD', category: 'Crypto & Digital Assets' },
  { symbol: 'RIOT',  name: 'Riot Platforms',           sector: 'Financial Services', exchange: 'NASDAQ', currency: 'USD', category: 'Crypto & Digital Assets' },

  // ── Industrials ───────────────────────────────────────────────────────────
  { symbol: 'CAT',   name: 'Caterpillar',              sector: 'Industrials',        exchange: 'NYSE',   currency: 'USD', category: 'Industrials' },
  { symbol: 'HON',   name: 'Honeywell',                sector: 'Industrials',        exchange: 'NASDAQ', currency: 'USD', category: 'Industrials' },
  { symbol: 'BA',    name: 'Boeing',                   sector: 'Industrials',        exchange: 'NYSE',   currency: 'USD', category: 'Industrials' },

  // ── E-Commerce & Tech ─────────────────────────────────────────────────────
  { symbol: 'AMZN',  name: 'Amazon',                   sector: 'Consumer Cyclical',  exchange: 'NASDAQ', currency: 'USD', category: 'E-Commerce & Tech' },
  { symbol: 'AAPL',  name: 'Apple',                    sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'E-Commerce & Tech' },
  { symbol: 'CRM',   name: 'Salesforce',               sector: 'Technology',         exchange: 'NYSE',   currency: 'USD', category: 'E-Commerce & Tech' },
  { symbol: 'ADBE',  name: 'Adobe',                    sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'E-Commerce & Tech' },

  // ── AI Speculative ────────────────────────────────────────────────────────
  { symbol: 'PLTR',  name: 'Palantir Technologies',    sector: 'Technology',         exchange: 'NYSE',   currency: 'USD', category: 'AI Speculative' },
  { symbol: 'SMCI',  name: 'Super Micro Computer',     sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'AI Speculative' },
  { symbol: 'APLD',  name: 'Applied Digital',          sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'AI Speculative' },
  { symbol: 'AI',    name: 'C3.ai',                    sector: 'Technology',         exchange: 'NYSE',   currency: 'USD', category: 'AI Speculative' },
  { symbol: 'SOUN',  name: 'SoundHound AI',            sector: 'Technology',         exchange: 'NASDAQ', currency: 'USD', category: 'AI Speculative' },
  { symbol: 'SNOW',  name: 'Snowflake',                sector: 'Technology',         exchange: 'NYSE',   currency: 'USD', category: 'AI Speculative' },
];
