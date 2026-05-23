/**
 * Broad US stock universe for scanners.
 * ~1,200 symbols covering S&P 500, S&P 400 mid-caps, popular NASDAQ/NYSE names,
 * and high-volume growth stocks. Filters (price, vol, mktcap) applied at scan time.
 */

import { SP500_LARGE_CAP } from './sp500';

// ── Additional mid-cap & growth stocks not in SP500_LARGE_CAP ─────────────────

const US_MIDCAP_EXTENDED: string[] = [
  // ── Tech / Software ────────────────────────────────────────────────────────
  'SHOP','COIN','SOFI','AFRM','NU','GTLB','CFLT','MNDY','BILL','TOST',
  'IOT','APPN','WEX','MANH','NCNO','FRSH','JAMF','ALRM','ESTC','DT',
  'MQ','SMCI','WK','DUOL','ZI','PCOR','VERX','LSPD','GLBE','STNE',
  'GEN','RKLB','ACMR','FORM','RELY','ARIS','TASK','FOUR','OLO','PAR',
  'ACVA','ALTR','APPF','AVDX','CDAY','CELH','CLSK','COUP','CSGP','DSGX',
  'EVBG','FIVN','FLYW','FRPT','FTAI','GCMG','INFA','INST','IPGP','IRDM',
  'JAMF','KRTX','LPSN','MTSI','NABL','NTDOY','OPEN','PYCR','QTWO','RPAY',
  'SEMR','SPSC','SSNC','TRMK','TTGT','UPLD','VBTX','WEAV','WOLF','XELA',
  'ZETA','CEVA','DIOD','FORM','HIMX','ICHR','ONTO','PSTG','SITM','SWKS',
  'QRVO','CRUS','SLAB','ALGM','AMKR','COHU','UCTT','ACLS','CAMT','AMBA',

  // ── Semiconductors / Hardware (not in S&P 500 list) ───────────────────────
  'AEHR','AAOI','CODA','CRDO','EQIX','FARO','GSIT','IMOS','IPHI','ITRN',
  'LYTS','OUST','PCTI','PDFS','PI','PLXS','PMTS','POWI','POWL','PRGS',
  'PRTH','PTCT','PTEN','SMTC','SONOS','SPNS','STRL','TGIO','TTMI','TWST',
  'UCTT','USLM','VCNX','VICR','VIRC','WRAP','XPEL',

  // ── FinTech / Financial Services ──────────────────────────────────────────
  'HOOD','MSTR','AFG','AMG','EWBC','COLB','COOP','PFSI','ESNT','NMI',
  'GHLD','HMST','FHB','BANC','CADE','UMBF','FFIN','WSFS','WAL','TCBI',
  'ARES','KKR','APO','CG','TPG','BX','RYAN','KNSL','SKWD','ACGL',
  'AXS','FAF','FNF','SAMB','TRUP','HCCI','LMND','HCI','UPC','PLMR',
  'GPOR','RCMT','CSWC','MAIN','ARCC','TPVG','FDUS','GBDC','NEWT','GLAD',
  'KCAP','PSEC','SLRC','PFLT','OCSL','OXSQ','RAND','SUNS','WHF',

  // ── Healthcare / Biotech ──────────────────────────────────────────────────
  'ACAD','ALKS','BHVN','BMRN','CLDX','DOCS','DVAX','EXEL','FOLD','GKOS',
  'HALO','HIMS','INMD','IONS','IOVA','ITCI','JAZZ','KPTI','KYMR','LNTH',
  'MDGL','MRTX','NKTR','NTRA','NTLA','PGNY','RCKT','RLAY','SAGE','SILK',
  'SRPT','STAA','SWAV','TELA','TGTX','TMCI','VERV','VKTX','XNCR','ARQT',
  'INVA','PRTA','PTGX','BBIO','BCRX','CRSP','EDIT','FATE','DNLI','CORT',
  'ACLS','ACAD','AGIO','AKRO','ALEC','ANAB','ARVN','ATRC','AXSM','BCAB',
  'BNGO','CABA','CALT','CDNA','CERE','CHRS','CLPT','CNMD','CPIX','CPRX',
  'CVAC','DCTH','DNXC','DYAI','ENTA','EPZM','ERAS','FDMT','FLXN','GNCA',
  'GRPH','HCAT','HRMY','IBRX','ICAD','ICUI','IDYA','IMGN','JANX','JNCE',
  'KALA','LGND','LUNG','MCRB','MDVX','MGNX','MIRM','MRVI','NBIX','NKTR',
  'OCGN','OLMA','OMCL','OPCH','ORIC','ORPH','PHAT','RARE','RCUS','RETA',
  'RPID','RPRX','SAVA','SCPH','SLDB','SLNO','SPNE','SPNT','SUPN','TCON',
  'TNXP','TRIL','UCTT','VCYT','VNDA','XERS','XLRN','ACNB','MRUS',

  // ── Consumer Discretionary ────────────────────────────────────────────────
  'BOOT','BIRK','DKNG','PLNT','SFM','THO','WGO','NVR','MTH','IBP',
  'LGIH','SIX','SKX','YETI','ANF','URBN','DKS','POOL','WHR','NWL',
  'LKQ','CACC','SCI','NCLH','JBLU','SAVE','ALK','SKYW','MESA','ATSG',
  'WING','FWRG','SHAK','CAVA','FAT','YELP','TRIP','BFAM','CRI','GPC',
  'HAS','MAT','FNKO','JAKK','PBI','SBH','COTY','ELF','PRGO','USFD',
  'SFM','SPTN','CHEF','PFGC','UNFI','DNUT','FRSH','BROS','PTRY','COCO',
  'BYND','APPH','RMTI','SKIN','NWTN',

  // ── Consumer Staples ──────────────────────────────────────────────────────
  'GO','OLLI','BJ','FRPT','COKE','VLGEA','WEYS','PPC','SAFM','TSN',
  'LANC','JJSF','STKL','LWAY','SMPL','VITL','NOMD','HNST','BTRS',

  // ── Industrials ───────────────────────────────────────────────────────────
  'FIX','EME','BMI','AYI','CSWI','ASTE','POWL','DY','GVA','OSK',
  'TEX','PCAR','MRC','GMS','BECN','SSD','UFPI','LPX','JELD','ROCK',
  'MLI','ITRI','AWI','CSL','IBP','HUBB','GNSS','HRI','BV','RBC',
  'KTOS','CACI','SAIC','BAH','DRS','TDY','CW','HEI','AXON','LHX',
  'LDOS','MANT','VRSN','BWXT','ESLT','AVAV','KRATOS','SPIR','RDW',
  'RKLB','ASTS','JOBY','ACHR','LILM','EH','ACMR','BLNK','CHPT','EVGO',
  'NXRT','OPEN','RIVN','LCID','XPEV','LI','NIO','GOEV',

  // ── Energy (mid-cap) ──────────────────────────────────────────────────────
  'CIVI','CHRD','MTDR','NOG','MGY','VTLE','OVV','CVE','CTRA','ROCC',
  'PDCE','REX','WTI','ARCH','CEIX','BTU','AMR','ARLP','FANG','DINO',
  'PBF','DKL','CAPL','GLP','SUN','USAC','TRGP','DT','TRP','ENB',

  // ── Materials ─────────────────────────────────────────────────────────────
  'MP','SQM','KGC','AEM','PAAS','EGO','NGD','AU','GFI','WPM',
  'OR','SAND','MAG','SILV','VZLA','USAS','GATO','FLR','STLD',
  'USLM','VMI','HXL','KALU','MLI','CENX','TMST','ZEUS','HAYN',

  // ── REITs / Real Estate ───────────────────────────────────────────────────
  'IIPR','GLPI','FCPT','NTST','STWD','KREF','EPR','NHI','LTC','SBRA',
  'OHI','CTRE','GOOD','UNIT','DEA','EPRT','GMRE','NREF','PINE','PLYM',
  'ROIC','SKT','SITC','KRG','ALEX','ACCO','BDN','CIO','HIW','PDM',
  'SLG','VNO','BXP','DEI','EQC','JBG','JBGS','OFC','EGP','COLD',

  // ── BDCs / Specialty Finance ──────────────────────────────────────────────
  'CSWC','MAIN','ARCC','TPVG','FDUS','GBDC','NEWT','GLAD','PSEC','SLRC',

  // ── Communications / Media ────────────────────────────────────────────────
  'PARA','NYT','CNK','IMAX','AMC','MSGS','MSGN','LUMN','SHEN','CNSL',
  'LBTYA','LBTYK','BATRK','FWONA','FWONK','LLYVK','SIRI','IHRT','AMCX',

  // ── Popular high-momentum / meme / growth names ──────────────────────────
  'GME','BBBY','MARA','RIOT','CLSK','HUT','BTBT','CIFR','WULF','CORZ',
  'NVAX','MRNA','BNTX','CVAC','OCGN','VXUS','EYES','GOVX',
  'ASTR','SPCE','ASTS','MNTS','SATL','BKSY','MDA','GHC',
  'PTON','BYND','HOOD','GREE','SPRT',

  // ── Quantum computing ─────────────────────────────────────────────────────
  'IONQ','QBTS','RGTI','QUBT','QTUM','ARQQ','QMCO',

  // ── AI / Machine Learning / Robotics ──────────────────────────────────────
  'SOUN','BBAI','GFAI','AITX','TRNX','CWAN','BITO',
  'ALAB','NVTS','SMCI','AI','BBAI','PRCT','UPST','LMND',
  'GENI','PATH','AISP','ABDE','AMBA',

  // ── Crypto-adjacent / Bitcoin miners ─────────────────────────────────────
  'BITF','BTBT','BTDR','BTCS','HIVE','BTCM','MIGI',
  'MSTR','COIN','HOOD',

  // ── Space / Defense tech ─────────────────────────────────────────────────
  'RKLB','ASTS','SPCE','LUNR','KTOS','BKSY','PL',
  'GNSS','SPIR','RDW','SAT',

  // ── EV / Clean energy ────────────────────────────────────────────────────
  'RIVN','LCID','GOEV','FSR','WKHS','RIDE','NKLA','SOLO',
  'EVGO','BLNK','CHPT','FFIE','MULN','PTRA','ZEV',

  // ── Biotech / Gene editing ────────────────────────────────────────────────
  'BEAM','CRSP','NTLA','EDIT','VERV','SGMO','BNGO','PACB',
  'TWST','RXRX','SEER','MYPS','CLVT',
];

/** Deduplicated combined universe (~1,200 US stocks). */
export const US_STOCKS: string[] = [
  ...new Set([...SP500_LARGE_CAP, ...US_MIDCAP_EXTENDED]),
];
