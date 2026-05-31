/**
 * POST /api/watchlist/claim
 * Body: { oldDeviceId, customCode }
 *
 * Migrates all watchlist rows from oldDeviceId to a user-chosen customCode as
 * the new device_id.  If the customCode already exists in the DB this just
 * returns the existing watchlist (so entering the same code on any device
 * "logs in" to the right watchlist).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const CODE_RE = /^[A-Z0-9_-]{4,20}$/i;

export async function POST(req: NextRequest) {
  let body: { oldDeviceId?: string; customCode?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const customCode   = (body.customCode ?? '').trim().toUpperCase().replace(/\s+/g, '_');
  const oldDeviceId  = (body.oldDeviceId ?? '').trim();

  if (!CODE_RE.test(customCode)) {
    return NextResponse.json({ error: 'Code must be 4–20 letters/numbers (no spaces)' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Check if customCode already has a watchlist
    const { data: existing } = await supabase
      .from('watchlist')
      .select('symbol, name, type, warning, added_at')
      .eq('device_id', customCode)
      .order('added_at', { ascending: true });

    if (existing && existing.length > 0) {
      // Code exists — just return its watchlist (this is the "login" path)
      return NextResponse.json({
        action:   'loaded',
        deviceId: customCode,
        items:    existing,
      });
    }

    // Code is free — migrate rows from oldDeviceId to customCode
    if (oldDeviceId) {
      const { data: oldRows } = await supabase
        .from('watchlist')
        .select('symbol, name, type, warning, added_at')
        .eq('device_id', oldDeviceId);

      if (oldRows && oldRows.length > 0) {
        // Insert under new code
        await supabase.from('watchlist').upsert(
          oldRows.map(r => ({ ...r, device_id: customCode })),
          { onConflict: 'device_id,symbol' },
        );
        // Remove old rows
        await supabase.from('watchlist').delete().eq('device_id', oldDeviceId);
      }
    }

    // Return whatever is now under customCode
    const { data: newRows } = await supabase
      .from('watchlist')
      .select('symbol, name, type, warning, added_at')
      .eq('device_id', customCode)
      .order('added_at', { ascending: true });

    return NextResponse.json({
      action:   'created',
      deviceId: customCode,
      items:    newRows ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
