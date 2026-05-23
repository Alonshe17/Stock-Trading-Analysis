import { NextResponse } from 'next/server';
import { runDayBuyVolumeScanner } from '@/lib/dayBuyVolumeScanner';
import { US_STOCKS } from '@/lib/usStocks';

export const dynamic    = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  try {
    const results = await runDayBuyVolumeScanner(US_STOCKS, 50);
    return NextResponse.json(results);
  } catch (err) {
    console.error('[daybuyvolume] scan error:', err);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
