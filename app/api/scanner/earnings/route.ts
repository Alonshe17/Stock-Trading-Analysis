import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { runEarningsScanner } from '@/lib/earningsScanner';

export const dynamic    = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') ?? new Date().toISOString().split('T')[0];
    const days      = Math.min(60, Math.max(1, Number(searchParams.get('days') ?? 30)));

    const results = await runEarningsScanner(startDate, days);
    return NextResponse.json(results);
  } catch (err) {
    console.error('[earnings] scan error:', err);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
