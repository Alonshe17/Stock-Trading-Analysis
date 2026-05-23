import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { runDayBuyVolumeScanner } from '@/lib/dayBuyVolumeScanner';
import { US_STOCKS } from '@/lib/usStocks';

export const dynamic    = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endDate   = searchParams.get('endDate')   ?? undefined;  // YYYY-MM-DD
    const startDate = searchParams.get('startDate') ?? undefined;  // YYYY-MM-DD

    const results = await runDayBuyVolumeScanner(US_STOCKS, 100, endDate, startDate);
    return NextResponse.json(results);
  } catch (err) {
    console.error('[daybuyvolume] scan error:', err);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
