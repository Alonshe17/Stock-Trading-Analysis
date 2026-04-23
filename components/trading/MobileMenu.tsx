'use client';

import { useState } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '/dashboard',       label: 'Dashboard',    color: 'text-gray-200' },
  { href: '/trends',          label: 'Trends',       color: 'text-amber-400' },
  { href: '/recommendations', label: 'Picks',        color: 'text-gray-200' },
  { href: '/screener',        label: 'Screener',     color: 'text-gray-200' },
  { href: '/watchlist',       label: 'Watchlist',    color: 'text-gray-200' },
  { href: '/alerts',          label: 'Alerts',       color: 'text-gray-200' },
  { href: '/methodology',     label: 'Methodology',  color: 'text-gray-500' },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative sm:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex flex-col gap-1.5 p-2 rounded-lg border border-gray-700 bg-gray-900 hover:border-gray-500 transition"
        aria-label="Open menu"
      >
        <span className={`block h-0.5 w-5 bg-gray-300 transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block h-0.5 w-5 bg-gray-300 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
        <span className={`block h-0.5 w-5 bg-gray-300 transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Menu panel */}
          <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-gray-700 bg-gray-900 shadow-xl py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium ${link.color} hover:bg-gray-800 transition`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
