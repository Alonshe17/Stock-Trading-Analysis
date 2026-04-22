import type { Candle } from './finnhub';

// Returns the most significant pattern name found in the last few candles, or null.
export function detectPattern(candles: Candle[]): string | null {
  if (candles.length < 2) return null;

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  const lastBody = Math.abs(last.c - last.o);
  const lastRange = last.h - last.l;
  const lastUpperWick = last.h - Math.max(last.c, last.o);
  const lastLowerWick = Math.min(last.c, last.o) - last.l;
  const lastBullish = last.c > last.o;

  const prevBody = Math.abs(prev.c - prev.o);
  const prevBullish = prev.c > prev.o;

  // Inside Bar: current range fully inside previous range
  if (last.h < prev.h && last.l > prev.l) return 'Inside Bar';

  // Bullish Engulfing
  if (
    !prevBullish &&
    lastBullish &&
    last.c > prev.o &&
    last.o < prev.c &&
    lastBody > prevBody
  ) return 'Bullish Engulfing';

  // Bearish Engulfing
  if (
    prevBullish &&
    !lastBullish &&
    last.c < prev.o &&
    last.o > prev.c &&
    lastBody > prevBody
  ) return 'Bearish Engulfing';

  // Bullish Pin Bar (hammer): long lower wick, small body at top
  if (
    lastRange > 0 &&
    lastLowerWick > lastBody * 2 &&
    lastLowerWick > lastUpperWick * 2 &&
    lastBody < lastRange * 0.35
  ) return 'Pin Bar';

  // Shooting Star: long upper wick, small body at bottom
  if (
    lastRange > 0 &&
    lastUpperWick > lastBody * 2 &&
    lastUpperWick > lastLowerWick * 2 &&
    lastBody < lastRange * 0.35
  ) return 'Shooting Star';

  // Breakout Candle: large bullish body with high volume impulse
  if (candles.length >= 3) {
    const atrApprox = candles.slice(-14).reduce((sum, c) => sum + (c.h - c.l), 0) / 14;
    if (lastBullish && lastBody > atrApprox * 1.5 && last.c > last.h - lastRange * 0.25) {
      return 'Breakout Candle';
    }
  }

  return null;
}
