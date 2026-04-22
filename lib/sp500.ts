// ~500 US large-cap stocks used as the scanner/screener universe
export const SP500_LARGE_CAP: string[] = [
  // Mega-cap tech
  'AAPL','MSFT','NVDA','AMZN','GOOGL','GOOG','META','TSLA','AVGO','ORCL',
  'ADBE','CRM','AMD','INTC','QCOM','TXN','AMAT','LRCX','KLAC','MCHP',
  'SNPS','CDNS','NOW','PANW','FTNT','CRWD','ZS','DDOG','NET','MDB',
  'SNOW','PLTR','APP','ARM','WDAY','VEEV','TEAM','HUBS','OKTA','DOCU',

  // Semiconductors & hardware
  'CSCO','IBM','ACN','INTU','ANET','MRVL','NXPI','TEL','GLW','STX',
  'WDC','VRSN','CTSH','IT','ROP','ANSS','KEYS','TRMB','ZBRA','PAYC',
  'PCTY','TWLO','ZM','HPQ','HPE','DELL','JNPR','FFIV','GDDY','TDC',
  'PTC','EPAM','ON','MPWR','TER','ONTO','NTAP','PSTG','WOLF','SMAR',

  // Financials — banks
  'JPM','BAC','WFC','GS','MS','USB','PNC','TFC','COF','RF',
  'KEY','FITB','HBAN','CFG','MTB','ZION','CMA','FHN','NTRS','STT',
  'BK','ALLY','SCHW','AXP','V','MA','PYPL',

  // Financials — insurance & asset mgmt
  'BLK','SPGI','MCO','CME','ICE','CB','AMP','AON','MMC','PRU',
  'MET','AFL','HIG','ALL','TRV','AIG','WRB','RJF','TROW','BEN',
  'IVZ','MKTX','BR','FDS','MSCI','CBOE','LNC','UNM','GL','PFG',
  'VOYA','EG','L','RE','RNR','WTW',

  // Healthcare — pharma & biotech
  'UNH','LLY','JNJ','ABBV','MRK','PFE','TMO','ABT','DHR','BSX',
  'SYK','ISRG','MDT','ELV','CI','CVS','HUM','GILD','REGN','VRTX',
  'AMGN','BIIB','BMY','ZTS','IDXX','MRNA','BNTX','ILMN','INCY','ALNY',
  'SGEN','EXAS','NVCR','RGEN','LEGN','KRYS','PCVX','ROIV',

  // Healthcare — devices & services
  'A','BDX','BAX','CAH','MCK','COR','LH','DGX','IQV','CRL',
  'MTD','WAT','TFX','STE','RMD','DXCM','EW','HOLX','ALGN','PODD',
  'HCA','UHS','DVA','MOH','CNC','VTRS','PRGO','COO','HSIC','OMI',
  'PDCO','XRAY','PKI','GEHC','INSP',

  // Consumer discretionary — retail
  'WMT','COST','TGT','HD','LOW','BKNG','EXPE','ABNB',
  'AZO','ORLY','KMX','AN','TSCO','FIVE','BJ','OLLI','DG','DLTR',
  'TJX','ROST','BBY','ULTA','LULU','NKE','VFC','PVH','RL','TPR',

  // Consumer discretionary — autos & travel
  'F','GM','HLT','MAR','LVS','WYNN','MGM','CZR','CCL',
  'RCL','NCLH','H','PENN','SEAS',

  // Consumer discretionary — restaurants & leisure
  'MCD','SBUX','YUM','CMG','DPZ','QSR','WEN','JACK','TXRH','DENN',
  'EAT','DRI','BLMN','CAKE','LYV',

  // Consumer staples
  'PG','KO','PEP','PM','MO','CL','MDLZ','GIS','K','HSY',
  'STZ','TAP','KHC','MKC','CAG','SJM','CPB','HRL','LW','INGR',
  'CHD','CLX','EL','COTY','HAS','MAT','MNST','CELH',

  // Industrials — aerospace & defense
  'LMT','RTX','BA','NOC','GD','HII','AXON','KTOS','LDOS','BAH',
  'CACI','SAIC','DRS','TDY','CW','HEI',

  // Industrials — machinery & equipment
  'CAT','DE','HON','MMM','GE','EMR','ETN','ITW','PH','ROK',
  'DOV','AME','CTAS','FAST','GWW','SWK','SNA','NDSN','IEX','GGG',
  'GNRC','HUBB','LII','TT','CARR','OTIS','IR','JCI','AOS','WSO',
  'RBC','TKR','AGCO','FBIN',

  // Industrials — transport & logistics
  'UPS','FDX','CSX','NSC','UNP','JBHT','ODFL','SAIA','XPO','EXPD',
  'CPRT','URI','WERN','LSTR','R','WAB','GXO','CHRW',

  // Industrials — building & construction
  'VMC','MLM','EXP','BLDR','MAS','TREX','AZEK','WMS','SUM','SITE',

  // Energy — oil & gas producers
  'XOM','CVX','COP','EOG','DVN','FANG','CTRA','OXY','MRO','HES',
  'APA','AR','RRC','SM',

  // Energy — midstream & services
  'SLB','HAL','BKR','MPC','PSX','VLO','KMI','OKE','WMB','TRGP',
  'LNG','WES','AM','NOV','FTI',

  // Materials
  'LIN','APD','ECL','DOW','LYB','NEM','FCX','ALB','AA','CF',
  'MOS','CTVA','FMC','NUE','STLD','CLF','X','RS','CMC','ATI',
  'WRK','IP','PKG','SEE','BALL','SON','PPG','SHW','RPM','EMN',
  'HUN','CE','OLN','AXTA','TROX',

  // Utilities
  'NEE','DUK','SO','AEP','EXC','XEL','ED','PPL','FE','ES',
  'D','SRE','PCG','EIX','ETR','AEE','CMS','CNP','WEC','LNT',
  'NI','PNW','AWK','ATO','NWE','SR',

  // Real estate — industrial & data center
  'PLD','EQIX','DLR','AMT','CCI','SBAC','IRM','FR','REXR','EGP',
  'STAG','LXP','COLD',

  // Real estate — residential & commercial
  'PSA','EQR','AVB','ESS','MAA','UDR','CPT','INVH','AMH','VICI',
  'O','NNN','ADC','ROIC','KIM','REG','SPG','BXP','VNO','SLG',
  'WELL','VTR','PEAK','HST','PK',

  // Communication services
  'T','VZ','TMUS','CMCSA','CHTR','NFLX','DIS','WBD','SIRI',
  'NWSA','FOXA','IAC','SPOT','ROKU','TTWO','EA','RBLX','SNAP','PINS',
  'MTCH','ZG','YELP',

  // Broad market ETFs (highly liquid, useful for regime context)
  'SPY','QQQ','IWM','DIA','XLF','XLK','XLE','XLV','XLI','XLU',
  'XLP','XLY','XLB','XLRE','XLC','GLD','SLV','TLT','HYG','LQD',
];
