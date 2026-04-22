import { NextResponse } from 'next/server';
import { runIntradayScanner } from '@/lib/intraday';
import { SP500_LARGE_CAP } from '@/lib/sp500';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results = await runIntradayScanner(SP500_LARGE_CAP);
    return NextResponse.json(results);
  } catch (err) {
    console.error('Scanner error:', err);
    return NextResponse.json({ error: 'Scanner failed' }, { status: 500 });
  }
}
