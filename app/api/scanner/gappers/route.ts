import { NextResponse } from 'next/server';
import { runGappersScanner } from '@/lib/gappersScanner';

export const dynamic     = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby plan max

export async function GET() {
  try {
    const results = await runGappersScanner();
    return NextResponse.json(results);
  } catch (err) {
    console.error('Gappers scanner error:', err);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
