'use client';

import type { NewsItem } from '@/lib/finnhub';

export function NewsPanel({ news, title = 'Latest News' }: { news: NewsItem[]; title?: string }) {
  if (news.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
        <p className="text-sm text-gray-600">No recent news available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-4">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const date = new Date(item.datetime * 1000);
  const timeAgo = getTimeAgo(date);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer noopener"
      className="flex gap-3 group hover:bg-gray-800/60 rounded-lg p-2 -mx-2 transition"
    >
      {item.image && (
        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 font-medium leading-snug group-hover:text-white transition line-clamp-2">
          {item.headline}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-gray-500">{item.source}</span>
          <span className="text-gray-700">·</span>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>
      </div>
    </a>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
