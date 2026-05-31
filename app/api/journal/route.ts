/**
 * /api/journal
 *
 * GET  ?device_id=xxx[&symbol=AAPL]  — list entries (newest first)
 * POST                                — create entry
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('device_id') ?? '';
  const symbol   = req.nextUrl.searchParams.get('symbol')?.toUpperCase() ?? null;

  if (!deviceId) return NextResponse.json({ error: 'device_id required' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from('journal')
    .select('*')
    .eq('device_id', deviceId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (symbol) query = query.eq('symbol', symbol);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  let body: { device_id?: string; symbol?: string | null; entry_date?: string; title?: string; content?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { device_id, symbol, entry_date, title = '', content = '' } = body;
  if (!device_id || !entry_date || !content.trim()) {
    return NextResponse.json({ error: 'device_id, entry_date and content are required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('journal')
    .insert({
      device_id,
      symbol:     symbol?.toUpperCase() || null,
      entry_date,
      title:      title.trim(),
      content:    content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
