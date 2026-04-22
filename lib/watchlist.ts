export type WatchlistItem = {
  symbol: string;
  name: string;
  type: 'stock' | 'etf';
  warning?: 'small-cap';
};

export const WATCHLIST: WatchlistItem[] = [
  { symbol: 'TSLA',  name: 'Tesla',           type: 'stock' },
  { symbol: 'NVDA',  name: 'NVIDIA',           type: 'stock' },
  { symbol: 'UNH',   name: 'UnitedHealth',     type: 'stock' },
  { symbol: 'AMZN',  name: 'Amazon',           type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet',         type: 'stock' },
  { symbol: 'META',  name: 'Meta',             type: 'stock' },
  { symbol: 'MSFT',  name: 'Microsoft',        type: 'stock' },
  { symbol: 'AAPL',  name: 'Apple',            type: 'stock' },
  { symbol: 'APLD',  name: 'Applied Digital',  type: 'stock', warning: 'small-cap' },
  { symbol: 'SLV',   name: 'Silver ETF',       type: 'etf' },
  { symbol: 'GLD',   name: 'Gold ETF',         type: 'etf' },
];

export const WATCHLIST_SYMBOLS = WATCHLIST.map((w) => w.symbol);
