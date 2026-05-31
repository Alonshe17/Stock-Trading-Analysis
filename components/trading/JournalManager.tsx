'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDeviceId } from '@/lib/deviceId';
import type { JournalEntry } from '@/lib/journal';
import Link from 'next/link';

// ── helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(d: string): string {
  const [yr, mo, dy] = d.split('-').map(Number);
  const dt = new Date(Date.UTC(yr, mo - 1, dy));
  return dt.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// ── EntryEditor ───────────────────────────────────────────────────────────────

function EntryEditor({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<JournalEntry>;
  onSave: (draft: { symbol: string; entry_date: string; title: string; content: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [symbol,     setSymbol]     = useState(initial?.symbol     ?? '');
  const [entryDate,  setEntryDate]  = useState(initial?.entry_date ?? today());
  const [title,      setTitle]      = useState(initial?.title      ?? '');
  const [content,    setContent]    = useState(initial?.content    ?? '');

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-4">
      <div className="flex gap-3 flex-wrap">
        {/* Date */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={entryDate}
            onChange={e => setEntryDate(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Stock ticker (optional) */}
        <div className="w-36">
          <label className="block text-xs text-gray-500 mb-1">Stock (optional)</label>
          <input
            type="text"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g. NVDA"
            maxLength={6}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none uppercase"
          />
        </div>

        {/* Title */}
        <div className="flex-[2] min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Breakout setup forming"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Content */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Notes</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write your thoughts here — setup rationale, entry/exit levels, market context, what you're watching…"
          rows={8}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none resize-y leading-relaxed"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave({ symbol, entry_date: entryDate, title, content })}
          disabled={saving || !content.trim()}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? 'Saving…' : 'Save Entry'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-700 px-5 py-2 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── EntryCard ─────────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry:    JournalEntry;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [confirming, setConfirming] = useState(false);

  const preview = entry.content.length > 200 && !expanded
    ? entry.content.slice(0, 200) + '…'
    : entry.content;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 hover:border-gray-700 transition group">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">{fmtDate(entry.entry_date)}</span>
          {entry.symbol && (
            <Link
              href={`/stock/${entry.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-900/40 border border-blue-700/40 text-blue-400 text-xs font-bold hover:bg-blue-900/60 transition"
            >
              {entry.symbol} ↗
            </Link>
          )}
          {entry.title && (
            <span className="text-sm font-semibold text-white">{entry.title}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={onEdit}
            title="Edit"
            className="rounded p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-800 transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {confirming ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onDelete}
                className="rounded px-2 py-1 text-xs bg-red-700 text-white hover:bg-red-600 transition"
              >Delete</button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-300 transition"
              >Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              title="Delete"
              className="rounded p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{preview}</p>
      {entry.content.length > 200 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-blue-400 hover:text-blue-300 mt-1.5 transition"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

// ── Main JournalManager ───────────────────────────────────────────────────────

export function JournalManager({ defaultSymbol }: { defaultSymbol?: string }) {
  const [entries,    setEntries]    = useState<JournalEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editTarget, setEditTarget] = useState<JournalEntry | null>(null);
  const [filterSym,  setFilterSym]  = useState(defaultSymbol ?? '');
  const [search,     setSearch]     = useState('');

  const deviceId = typeof window !== 'undefined' ? getDeviceId() : '';

  const load = useCallback(async (sym?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ device_id: deviceId });
      if (sym) params.set('symbol', sym);
      const res = await fetch(`/api/journal?${params}`);
      if (res.ok) setEntries(await res.json());
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => { load(filterSym || undefined); }, [load, filterSym]);

  async function handleSave(draft: { symbol: string; entry_date: string; title: string; content: string }) {
    setSaving(true);
    try {
      if (editTarget) {
        // Update
        const res = await fetch(`/api/journal/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId, ...draft }),
        });
        if (res.ok) {
          const updated: JournalEntry = await res.json();
          setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
        }
      } else {
        // Create
        const res = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId, ...draft }),
        });
        if (res.ok) {
          const created: JournalEntry = await res.json();
          setEntries(prev => [created, ...prev]);
        }
      }
      setShowEditor(false);
      setEditTarget(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/journal/${id}?device_id=${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function openNew() {
    setEditTarget(null);
    setShowEditor(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openEdit(entry: JournalEntry) {
    setEditTarget(entry);
    setShowEditor(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Apply client-side text search
  const displayed = entries.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.content.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      (e.symbol ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Entry
        </button>

        {/* Filter by symbol */}
        <input
          type="text"
          value={filterSym}
          onChange={e => setFilterSym(e.target.value.toUpperCase())}
          placeholder="Filter by ticker…"
          maxLength={6}
          className="w-36 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none uppercase"
        />

        {/* Text search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes…"
          className="flex-1 min-w-[180px] rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />

        <span className="text-xs text-gray-600 ml-auto">
          {displayed.length} entr{displayed.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* Editor */}
      {showEditor && (
        <EntryEditor
          initial={editTarget
            ? { symbol: editTarget.symbol ?? '', entry_date: editTarget.entry_date, title: editTarget.title, content: editTarget.content }
            : { symbol: filterSym || defaultSymbol || '', entry_date: today() }
          }
          onSave={handleSave}
          onCancel={() => { setShowEditor(false); setEditTarget(null); }}
          saving={saving}
        />
      )}

      {/* Entries */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-500 text-sm gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading journal…
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 p-12 text-center text-gray-500">
          <p className="text-sm">{search || filterSym ? 'No entries match your search.' : 'No journal entries yet.'}</p>
          {!showEditor && (
            <button onClick={openNew} className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition">
              Write your first entry →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => openEdit(entry)}
              onDelete={() => handleDelete(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
