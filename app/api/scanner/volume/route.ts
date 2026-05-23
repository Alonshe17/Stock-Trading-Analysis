import { NextRequest, NextResponse } from 'next/server';
import { runVolumeScanner } from '@/lib/volumeScanner';
import { US_STOCKS } from '@/lib/usStocks';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const sector = req.nextUrl.searchParams.get('sector') ?? undefined;
  try {
    const results = await runVolumeScanner(US_STOCKS, 40, sector);
    return NextResponse.json(results);
  } catch (err) {
    console.error('Volume scanner error:', err);
    return NextResponse.json({ error: 'Volume scan failed' }, { status: 500 });
  }
}
