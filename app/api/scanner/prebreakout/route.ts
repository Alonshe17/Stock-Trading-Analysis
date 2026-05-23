import { NextResponse } from 'next/server';
import { runPreBreakoutScanner } from '@/lib/preBreakout';
import { US_STOCKS } from '@/lib/usStocks';

export const dynamic    = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  try {
    const results = await runPreBreakoutScanner(US_STOCKS, 40);
    return NextResponse.json(results);
  } catch (err) {
    console.error('Pre-breakout scanner error:', err);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
