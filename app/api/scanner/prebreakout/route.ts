import { NextResponse } from 'next/server';
import { runPreBreakoutScanner } from '@/lib/preBreakout';
import { SP500_LARGE_CAP } from '@/lib/sp500';

export const dynamic    = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  try {
    const results = await runPreBreakoutScanner(SP500_LARGE_CAP, 40);
    return NextResponse.json(results);
  } catch (err) {
    console.error('Pre-breakout scanner error:', err);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
