import { NextResponse } from 'next/server';
import { runWeeklyVolumeScanner } from '@/lib/weeklyVolumeScanner';
import { US_STOCKS } from '@/lib/usStocks';

export const dynamic    = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  try {
    const results = await runWeeklyVolumeScanner(US_STOCKS, 50);
    return NextResponse.json(results);
  } catch (err) {
    console.error('Weekly volume scanner error:', err);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
