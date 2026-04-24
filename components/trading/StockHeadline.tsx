'use client';

import { useState, useEffect } from 'react';

interface HeadlineData {
  headline: string;
  source: string;
  url: string;
  datetime: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts * 1000) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const DOT: Record<string, string> = {
  bullish: 'bg-emerald-400',
  bearish: 'bg-red-400',
  neutral: 'bg-gray-500',
};

export function StockHeadline({
  symbol,
  companyName = '',
}: {
  symbol: string;
  companyName?: string;
}) {
  const [data, setData]       = useState<HeadlineData | null>(null);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ symbol });
    if (companyName) params.set('name', companyName);
    fetch(`/api/stocks/news?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [symbol, companyName]);

  // Don't occupy space while loading or if no news
  if (!loaded || !data) return null;

  return (
    <div className="border-l-2 border-gray-700 pl-2.5 flex items-start gap-1.5">
      {/* Sentiment dot */}
      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT[data.sentiment]}`} />
      <div className="min-w-0">
        {/* Headline — links to source article */}
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-300 hover:text-white leading-relaxed line-clamp-2 transition-colors"
        >
          {data.headline}
        </a>
        <p className="text-xs text-gray-600 mt-0.5">
          {data.source} · {timeAgo(data.datetime)}
        </p>
      </div>
    </div>
  );
}
