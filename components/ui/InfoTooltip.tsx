'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';

interface InfoTooltipProps {
  title: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  width?: string;
}

export function InfoTooltip({ title, children, side = 'top', width = 'w-72' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  // Close on outside click/touch
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // Lock body scroll when open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const panelContent = (
    <>
      <span className="flex items-start justify-between gap-2 mb-2">
        <span className="block font-semibold text-white text-sm leading-snug">{title}</span>
        {/* Close button — visible on mobile, hidden on desktop */}
        <button
          className="sm:hidden shrink-0 text-gray-500 hover:text-gray-300 p-0.5"
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </span>
      <span className="block text-xs text-gray-300 leading-relaxed space-y-1">{children}</span>
    </>
  );

  return (
    <span ref={wrapRef} className="relative inline-flex items-center">
      {/* ⓘ trigger button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`ml-1 inline-flex items-center transition-colors focus:outline-none ${open ? 'text-blue-400' : 'text-gray-600 hover:text-blue-400'}`}
        aria-label={`Info: ${title}`}
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <>
          {/* ── Mobile: full-screen dark backdrop ── */}
          <span
            className="sm:hidden fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />

          {/* ── Panel ──
               Mobile  : fixed, centered on screen, left-4/right-4 (ignores width prop)
               Desktop : absolute tooltip anchored to the ⓘ icon               ── */}
          <span
            className={[
              // Mobile — fixed centered
              'fixed left-4 right-4 top-1/2 -translate-y-1/2',
              // Desktop override — back to absolute positioned tooltip
              `sm:absolute sm:fixed-none sm:top-auto sm:right-auto sm:translate-y-0`,
              `sm:left-1/2 sm:-translate-x-1/2 sm:${width}`,
              side === 'top' ? 'sm:bottom-full sm:mb-2' : 'sm:top-full sm:mt-2',
              // Common
              'z-[9999] rounded-xl border border-gray-700 bg-gray-900 shadow-2xl p-4 text-left pointer-events-auto',
            ].join(' ')}
          >
            {panelContent}
            {/* Desktop caret */}
            {side === 'top' ? (
              <span className="hidden sm:block absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-700" />
            ) : (
              <span className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-b-gray-700" />
            )}
          </span>
        </>
      )}
    </span>
  );
}
