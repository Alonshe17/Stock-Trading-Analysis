/**
 * /api/journal/[id]
 *
 * PUT    — update entry (device_id must match)
 * DELETE — delete entry (device_id must match)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  let body: { device_id?: string; symbol?: string | null; entry_date?: string; title?: string; content?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { device_id, symbol, entry_date, title, content } = body;
  if (!device_id) return NextResponse.json({ error: 'device_id required' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('journal')
    .update({
      ...(symbol     !== undefined && { symbol: symbol?.toUpperCase() || null }),
      ...(entry_date !== undefined && { entry_date }),
      ...(title      !== undefined && { title: title.trim() }),
      ...(content    !== undefined && { content: content.trim() }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('device_id', device_id)   // security: only owner can edit
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const deviceId = req.nextUrl.searchParams.get('device_id') ?? '';
  if (!deviceId) return NextResponse.json({ error: 'device_id required' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('journal')
    .delete()
    .eq('id', id)
    .eq('device_id', deviceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
