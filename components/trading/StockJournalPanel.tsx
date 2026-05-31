'use client';

import { useState, useEffect } from 'react';
import { getDeviceId } from '@/lib/deviceId';
import type { JournalEntry } from '@/lib/journal';
import Link from 'next/link';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(d: string): string {
  const [yr, mo, dy] = d.split('-').map(Number);
  const dt = new Date(Date.UTC(yr, mo - 1, dy));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function StockJournalPanel({ symbol }: { symbol: string }) {
  const [entries,    setEntries]    = useState<JournalEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [collapsed,  setCollapsed]  = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);

  // Form state
  const [date,    setDate]    = useState(today());
  const [title,   setTitle]   = useState('');
  const [content, setContent] = useState('');

  const deviceId = typeof window !== 'undefined' ? getDeviceId() : '';

  useEffect(() => {
    if (!deviceId) return;
    fetch(`/api/journal?device_id=${encodeURIComponent(deviceId)}&symbol=${symbol}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setEntries(d); })
      .finally(() => setLoading(false));
  }, [deviceId, symbol]);

  function openNew() {
    setEditId(null);
    setDate(today());
    setTitle('');
    setContent('');
    setShowForm(true);
    setCollapsed(false);
  }

  function openEdit(e: JournalEntry) {
    setEditId(e.id);
    setDate(e.entry_date);
    setTitle(e.title);
    setContent(e.content);
    setShowForm(true);
    setCollapsed(false);
  }

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/journal/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId, symbol, entry_date: date, title, content }),
        });
        if (res.ok) {
          const updated: JournalEntry = await res.json();
          setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
        }
      } else {
        const res = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId, symbol, entry_date: date, title, content }),
        });
        if (res.ok) {
          const created: JournalEntry = await res.json();
          setEntries(prev => [created, ...prev]);
        }
      }
      setShowForm(false);
      setEditId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/journal/${id}?device_id=${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-white hover:text-gray-300 transition"
        >
          <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          My Journal
          {entries.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-400 text-[10px] font-semibold border border-amber-700/40">
              {entries.length}
            </span>
          )}
          <svg className={`h-3.5 w-3.5 text-gray-500 transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={openNew}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-700/40 rounded-lg px-2.5 py-1.5 transition"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Note
          </button>
          <Link
            href={`/journal?symbol=${symbol}`}
            className="text-xs text-gray-500 hover:text-gray-300 transition"
          >
            View all →
          </Link>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* Inline editor */}
          {showForm && (
            <div className="rounded-lg border border-blue-700/30 bg-blue-950/20 p-4 space-y-3">
              <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[130px]">
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex-[2] min-w-[160px]">
                  <label className="block text-xs text-gray-500 mb-1">Title (optional)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Entry setup, earnings play…"
                    className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`Your thoughts on ${symbol}…`}
                rows={5}
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none resize-y leading-relaxed"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !content.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving…' : editId ? 'Update' : 'Save'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditId(null); }}
                  className="rounded-lg border border-gray-700 px-4 py-1.5 text-xs text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Entry list */}
          {loading ? (
            <p className="text-xs text-gray-600 py-2">Loading…</p>
          ) : entries.length === 0 && !showForm ? (
            <div className="text-center py-6">
              <p className="text-xs text-gray-600">No notes for {symbol} yet.</p>
              <button onClick={openNew} className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition">
                Write your first note →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map(e => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  onEdit={() => openEdit(e)}
                  onDelete={() => handleDelete(e.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry, onEdit, onDelete }: { entry: JournalEntry; onEdit: () => void; onDelete: () => void }) {
  const [expanded,   setExpanded]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const preview = entry.content.length > 180 && !expanded ? entry.content.slice(0, 180) + '…' : entry.content;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500">{fmtDate(entry.entry_date)}</span>
          {entry.title && <span className="text-xs font-semibold text-white">{entry.title}</span>}
        </div>
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
          <button onClick={onEdit} title="Edit" className="rounded p-1 text-gray-500 hover:text-blue-400 hover:bg-gray-800 transition">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {confirming ? (
            <>
              <button onClick={onDelete} className="rounded px-1.5 py-0.5 text-[10px] bg-red-700 text-white hover:bg-red-600 transition">Del</button>
              <button onClick={() => setConfirming(false)} className="rounded px-1.5 py-0.5 text-[10px] text-gray-500 hover:text-gray-300 transition">✕</button>
            </>
          ) : (
            <button onClick={() => setConfirming(true)} title="Delete" className="rounded p-1 text-gray-500 hover:text-red-400 hover:bg-gray-800 transition">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{preview}</p>
      {entry.content.length > 180 && (
        <button onClick={() => setExpanded(v => !v)} className="text-[11px] text-blue-400 hover:text-blue-300 mt-1 transition">
          {expanded ? 'less' : 'more'}
        </button>
      )}
    </div>
  );
}
