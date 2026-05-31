/**
 * GET /api/watchlist/sync?code=ABCD1234
 *
 * Looks up whether any Supabase device_id starts with the given 8-char sync
 * code, and returns the full device_id if found.
 * This lets another device "adopt" that device_id and share the same watchlist.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (code.length !== 8) {
    return NextResponse.json({ error: 'Sync code must be 8 characters' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Find any watchlist row whose device_id starts with the code (case-insensitive)
    // UUIDs are stored as lowercase hex with dashes: xxxxxxxx-xxxx-...
    // Our code is the first 8 hex chars uppercased, so we search ilike 'CODE%'
    const { data, error } = await supabase
      .from('watchlist')
      .select('device_id')
      .ilike('device_id', `${code}%`)
      .limit(1);

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    return NextResponse.json({ found: true, deviceId: data[0].device_id });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
