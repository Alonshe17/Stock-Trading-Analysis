'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';

interface InfoTooltipProps {
  title: string;
  children: ReactNode;
  /** Which side the tooltip opens towards. Defaults to 'top'. */
  side?: 'top' | 'bottom';
  /** Extra width class if needed, e.g. 'w-80'. Defaults to 'w-72'. */
  width?: string;
}

/**
 * Small ⓘ icon that, when clicked, opens a tooltip panel with a title and body.
 * Closes when clicking outside. Works inside both server and client components.
 */
export function InfoTooltip({ title, children, side = 'top', width = 'w-72' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`ml-1 inline-flex items-center transition-colors focus:outline-none ${open ? 'text-blue-400' : 'text-gray-600 hover:text-blue-400'}`}
        aria-label={`Info: ${title}`}
      >
        {/* ⓘ icon */}
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <span
          className={`absolute z-[9999] left-1/2 -translate-x-1/2 ${width} rounded-xl border border-gray-700 bg-gray-900 shadow-2xl p-4 text-left pointer-events-none ${
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <span className="block font-semibold text-white text-sm mb-2">{title}</span>
          <span className="block text-xs text-gray-300 leading-relaxed space-y-1">{children}</span>
          {/* caret arrow */}
          {side === 'top' ? (
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-700" />
          ) : (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-b-gray-700" />
          )}
        </span>
      )}
    </span>
  );
}
