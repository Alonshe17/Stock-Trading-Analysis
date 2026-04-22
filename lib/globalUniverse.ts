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

export const ASIA_STOCKS: StockMeta[] = [
  // Japan
  { symbol: '7203.T',   name: 'Toyota Motor',          sector: 'Consumer Cyclical',  exchange: 'TSE',  currency: 'JPY' },
  { symbol: '6758.T',   name: 'Sony Group',             sector: 'Technology',         exchange: 'TSE',  currency: 'JPY' },
  { symbol: '9984.T',   name: 'SoftBank Group',         sector: 'Technology',         exchange: 'TSE',  currency: 'JPY' },
  { symbol: '6861.T',   name: 'Keyence',                sector: 'Technology',         exchange: 'TSE',  currency: 'JPY' },
  { symbol: '6367.T',   name: 'Daikin Industries',      sector: 'Industrials',        exchange: 'TSE',  currency: 'JPY' },
  { symbol: '8306.T',   name: 'MUFG',                   sector: 'Financial Services', exchange: 'TSE',  currency: 'JPY' },
  { symbol: '6501.T',   name: 'Hitachi',                sector: 'Industrials',        exchange: 'TSE',  currency: 'JPY' },
  { symbol: '9432.T',   name: 'NTT',                    sector: 'Communication Services', exchange: 'TSE', currency: 'JPY' },
  { symbol: '6902.T',   name: 'DENSO',                  sector: 'Consumer Cyclical',  exchange: 'TSE',  currency: 'JPY' },
  // Hong Kong
  { symbol: '0700.HK',  name: 'Tencent Holdings',       sector: 'Technology',         exchange: 'HKEX', currency: 'HKD' },
  { symbol: '9988.HK',  name: 'Alibaba Group',          sector: 'Consumer Cyclical',  exchange: 'HKEX', currency: 'HKD' },
  { symbol: '3690.HK',  name: 'Meituan',                sector: 'Consumer Cyclical',  exchange: 'HKEX', currency: 'HKD' },
  { symbol: '1810.HK',  name: 'Xiaomi',                 sector: 'Technology',         exchange: 'HKEX', currency: 'HKD' },
  { symbol: '0941.HK',  name: 'China Mobile',           sector: 'Communication Services', exchange: 'HKEX', currency: 'HKD' },
  { symbol: '2318.HK',  name: 'Ping An Insurance',      sector: 'Financial Services', exchange: 'HKEX', currency: 'HKD' },
  { symbol: '0005.HK',  name: 'HSBC Holdings HK',       sector: 'Financial Services', exchange: 'HKEX', currency: 'HKD' },
  // Korea
  { symbol: '005930.KS', name: 'Samsung Electronics',  sector: 'Technology',         exchange: 'KRX',  currency: 'KRW' },
  { symbol: '000660.KS', name: 'SK Hynix',              sector: 'Technology',         exchange: 'KRX',  currency: 'KRW' },
  { symbol: '005380.KS', name: 'Hyundai Motor',         sector: 'Consumer Cyclical',  exchange: 'KRX',  currency: 'KRW' },
  // Singapore
  { symbol: 'D05.SI',   name: 'DBS Group',              sector: 'Financial Services', exchange: 'SGX',  currency: 'SGD' },
  { symbol: 'O39.SI',   name: 'OCBC Bank',              sector: 'Financial Services', exchange: 'SGX',  currency: 'SGD' },
  { symbol: 'U11.SI',   name: 'UOB',                    sector: 'Financial Services', exchange: 'SGX',  currency: 'SGD' },
  // Australia
  { symbol: 'CBA.AX',   name: 'Commonwealth Bank',      sector: 'Financial Services', exchange: 'ASX',  currency: 'AUD' },
  { symbol: 'BHP.AX',   name: 'BHP Group',              sector: 'Basic Materials',    exchange: 'ASX',  currency: 'AUD' },
  { symbol: 'CSL.AX',   name: 'CSL Limited',            sector: 'Healthcare',         exchange: 'ASX',  currency: 'AUD' },
  // India
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy',             exchange: 'NSE',  currency: 'INR' },
  { symbol: 'TCS.NS',      name: 'Tata Consultancy',    sector: 'Technology',         exchange: 'NSE',  currency: 'INR' },
  { symbol: 'INFY.NS',     name: 'Infosys',             sector: 'Technology',         exchange: 'NSE',  currency: 'INR' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank',           sector: 'Financial Services', exchange: 'NSE',  currency: 'INR' },
];

export const EUR_UK_STOCKS: StockMeta[] = [
  // UK
  { symbol: 'SHEL.L',  name: 'Shell',              sector: 'Energy',                 exchange: 'LSE',      currency: 'GBP', category: 'Energy & Oil' },
  { symbol: 'AZN.L',   name: 'AstraZeneca',        sector: 'Healthcare',             exchange: 'LSE',      currency: 'GBP', category: 'Healthcare & Pharma' },
  { symbol: 'HSBA.L',  name: 'HSBC Holdings',      sector: 'Financial Services',     exchange: 'LSE',      currency: 'GBP' },
  { symbol: 'BP.L',    name: 'BP',                 sector: 'Energy',                 exchange: 'LSE',      currency: 'GBP', category: 'Energy & Oil' },
  { symbol: 'RIO.L',   name: 'Rio Tinto',          sector: 'Basic Materials',        exchange: 'LSE',      currency: 'GBP' },
  { symbol: 'ULVR.L',  name: 'Unilever',           sector: 'Consumer Defensive',     exchange: 'LSE',      currency: 'GBP', category: 'Consumer Defensive' },
  { symbol: 'GSK.L',   name: 'GSK',                sector: 'Healthcare',             exchange: 'LSE',      currency: 'GBP', category: 'Healthcare & Pharma' },
  { symbol: 'BARC.L',  name: 'Barclays',           sector: 'Financial Services',     exchange: 'LSE',      currency: 'GBP', category: 'Banking & Finance' },
  { symbol: 'LLOY.L',  name: 'Lloyds Banking',     sector: 'Financial Services',     exchange: 'LSE',      currency: 'GBP', category: 'Banking & Finance' },
  { symbol: 'REL.L',   name: 'RELX',               sector: 'Communication Services', exchange: 'LSE',      currency: 'GBP' },
  // Germany
  { symbol: 'SAP.DE',  name: 'SAP',                sector: 'Technology',             exchange: 'XETRA',    currency: 'EUR', category: 'AI & Cloud' },
  { symbol: 'SIE.DE',  name: 'Siemens',            sector: 'Industrials',            exchange: 'XETRA',    currency: 'EUR', category: 'Industrials' },
  { symbol: 'ALV.DE',  name: 'Allianz',            sector: 'Financial Services',     exchange: 'XETRA',    currency: 'EUR', category: 'Banking & Finance' },
  { symbol: 'BAYN.DE', name: 'Bayer',              sector: 'Healthcare',             exchange: 'XETRA',    currency: 'EUR', category: 'Healthcare & Pharma' },
  { symbol: 'MBG.DE',  name: 'Mercedes-Benz',      sector: 'Consumer Cyclical',      exchange: 'XETRA',    currency: 'EUR', category: 'EV & Clean Energy' },
  { symbol: 'DTE.DE',  name: 'Deutsche Telekom',   sector: 'Communication Services', exchange: 'XETRA',    currency: 'EUR' },
  // France
  { symbol: 'MC.PA',   name: 'LVMH',               sector: 'Consumer Cyclical',      exchange: 'Euronext', currency: 'EUR', category: 'Consumer Cyclical' },
  { symbol: 'OR.PA',   name: "L'Oreal",            sector: 'Consumer Defensive',     exchange: 'Euronext', currency: 'EUR', category: 'Consumer Defensive' },
  { symbol: 'SAN.PA',  name: 'Sanofi',             sector: 'Healthcare',             exchange: 'Euronext', currency: 'EUR', category: 'Healthcare & Pharma' },
  { symbol: 'BNP.PA',  name: 'BNP Paribas',        sector: 'Financial Services',     exchange: 'Euronext', currency: 'EUR', category: 'Banking & Finance' },
  { symbol: 'AIR.PA',  name: 'Airbus',             sector: 'Industrials',            exchange: 'Euronext', currency: 'EUR', category: 'Defense & Aerospace' },
  { symbol: 'TTE.PA',  name: 'TotalEnergies',      sector: 'Energy',                 exchange: 'Euronext', currency: 'EUR', category: 'Energy & Oil' },
  // Netherlands
  { symbol: 'ASML.AS', name: 'ASML Holding',       sector: 'Technology',             exchange: 'Euronext', currency: 'EUR', category: 'Semiconductors' },
  // Switzerland
  { symbol: 'NESN.SW', name: 'Nestle',             sector: 'Consumer Defensive',     exchange: 'SIX',      currency: 'CHF', category: 'Consumer Defensive' },
  { symbol: 'ROG.SW',  name: 'Roche Holding',      sector: 'Healthcare',             exchange: 'SIX',      currency: 'CHF', category: 'Healthcare & Pharma' },
  { symbol: 'NOVN.SW', name: 'Novartis',           sector: 'Healthcare',             exchange: 'SIX',      currency: 'CHF', category: 'Healthcare & Pharma' },
  { symbol: 'ABBN.SW', name: 'ABB',                sector: 'Industrials',            exchange: 'SIX',      currency: 'CHF', category: 'Industrials' },
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
 * Used by the /trends page. Includes key international ADRs and European names
 * alongside US large/mid caps. All fetched through Yahoo Finance.
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
  { symbol: 'ASML.AS', name: 'ASML Holding',           sector: 'Technology',         exchange: 'Euronext', currency: 'EUR', category: 'Semiconductors' },

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
  { symbol: 'AZN.L', name: 'AstraZeneca',              sector: 'Healthcare',         exchange: 'LSE',    currency: 'GBP', category: 'Healthcare & Pharma' },

  // ── Energy & Oil ──────────────────────────────────────────────────────────
  { symbol: 'XOM',   name: 'ExxonMobil',               sector: 'Energy',             exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },
  { symbol: 'CVX',   name: 'Chevron',                  sector: 'Energy',             exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },
  { symbol: 'COP',   name: 'ConocoPhillips',           sector: 'Energy',             exchange: 'NYSE',   currency: 'USD', category: 'Energy & Oil' },
  { symbol: 'SHEL.L', name: 'Shell',                   sector: 'Energy',             exchange: 'LSE',    currency: 'GBP', category: 'Energy & Oil' },

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
