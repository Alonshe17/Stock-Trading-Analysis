import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/dashboard',        label: 'Dashboard',   short: 'Dash'     },
  { href: '/daily-brief',      label: 'Daily Brief', short: 'Brief'    },
  { href: '/market-sentiment', label: 'Sentiment',   short: 'Sent'     },
  { href: '/watchlist',        label: 'Watchlist',   short: 'Watch'    },
  { href: '/screener',         label: 'Screener',    short: 'Screen'   },
  { href: '/scanner',          label: 'Scanner',     short: 'Scan'     },
  { href: '/recommendations',  label: 'Daily Picks', short: 'Picks'    },
  { href: '/trends',           label: 'Trends',      short: 'Trends'   },
  { href: '/alerts',           label: 'Alerts',      short: 'Alerts'   },
  { href: '/backtest',         label: 'Backtest',    short: 'BTest'    },
  { href: '/journal',          label: 'Journal',     short: 'Journal'  },
];

/**
 * Compact navigation bar shown at the top of every trading page.
 * On mobile it scrolls horizontally so all links stay reachable.
 * Pass `active` matching the current route (e.g. "/watchlist") to highlight it.
 */
export function TradingNav({ active }: { active?: string }) {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
      {NAV_ITEMS.map(({ href, label, short }) => {
        const isActive = active === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
              ${isActive
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
          >
            {/* Show short label on very small screens, full label otherwise */}
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
