/**
 * GET /api/watchlist/recover?symbol=AAPL
 *
 * Given a ticker symbol, finds every device_id in Supabase that has that
 * symbol in its watchlist.  Returns each device's full watchlist so the user
 * can pick the right one and restore it.
 *
 * Used when a user's device_id is lost (cache/cookie cleared) and they can
 * no longer load their own watchlist.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get('symbol') ?? '').toUpperCase().trim();

  if (!symbol || symbol.length < 1 || symbol.length > 6) {
    return NextResponse.json({ error: 'Provide a valid stock symbol' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Find all device_ids that have this symbol
    const { data: rows, error } = await supabase
      .from('watchlist')
      .select('device_id')
      .eq('symbol', symbol)
      .order('added_at', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 });
    if (!rows || rows.length === 0) {
      return NextResponse.json({ found: false, results: [] });
    }

    // For each device_id found, load its full watchlist
    const deviceIds = [...new Set(rows.map(r => r.device_id))].slice(0, 5);

    const results = await Promise.all(
      deviceIds.map(async (deviceId: string) => {
        const { data: items } = await supabase
          .from('watchlist')
          .select('symbol, name, type, added_at')
          .eq('device_id', deviceId)
          .order('added_at', { ascending: true });

        return {
          deviceId,
          syncCode: deviceId.replace(/-/g, '').substring(0, 8).toUpperCase(),
          count: items?.length ?? 0,
          symbols: (items ?? []).map(i => i.symbol),
          latestAdd: items?.at(-1)?.added_at ?? null,
        };
      })
    );

    // Sort by most stocks first
    results.sort((a, b) => b.count - a.count);

    return NextResponse.json({ found: true, results });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
