'use client';

import type { NewsItem } from '@/lib/finnhub';

// ─── Simple keyword-based sentiment ─────────────────────────────────────────
const BULLISH_WORDS = [
  'surge', 'surges', 'rally', 'rallies', 'beat', 'beats', 'record', 'upgrade',
  'upgraded', 'buy', 'outperform', 'bullish', 'growth', 'profit', 'raised',
  'raises', 'strong', 'gain', 'gains', 'high', 'breakout', 'exceeds', 'tops',
  'boost', 'positive', 'soar', 'soars', 'rise', 'rises', 'rises',
];
const BEARISH_WORDS = [
  'fall', 'falls', 'drop', 'drops', 'decline', 'declines', 'miss', 'misses',
  'downgrade', 'downgraded', 'sell', 'underperform', 'bearish', 'loss', 'cut',
  'cuts', 'weak', 'slump', 'slumps', 'low', 'breakdown', 'below', 'concern',
  'concerns', 'warning', 'warns', 'layoff', 'layoffs', 'recall', 'lawsuit',
];

function scoreSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const words = text.toLowerCase().split(/\W+/);
  let score = 0;
  for (const w of words) {
    if (BULLISH_WORDS.includes(w)) score += 1;
    if (BEARISH_WORDS.includes(w)) score -= 1;
  }
  if (score >= 1) return 'bullish';
  if (score <= -1) return 'bearish';
  return 'neutral';
}

const SENTIMENT_STYLE: Record<string, string> = {
  bullish: 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50',
  bearish: 'bg-red-900/30 text-red-400 border border-red-800/50',
  neutral: 'bg-gray-800/60 text-gray-400 border border-gray-700/50',
};
const SENTIMENT_DOT: Record<string, string> = {
  bullish: 'bg-emerald-400',
  bearish: 'bg-red-400',
  neutral: 'bg-gray-500',
};

// ─── Digest — derive key themes from top headlines ───────────────────────────
function buildDigest(news: NewsItem[]): string {
  if (news.length === 0) return '';
  // Use the first article's summary as the "latest context" — it's already a
  // 1–2 sentence description from Finnhub.
  const latest = news[0];
  return latest.summary?.trim() || latest.headline;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function StockNewsPanel({
  news,
  symbol,
}: {
  news: NewsItem[];
  symbol: string;
}) {
  const sorted = [...news]
    .filter((n) => n.headline)
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 8);

  const digest = buildDigest(sorted);

  const bullCount = sorted.filter((n) => scoreSentiment(n.headline) === 'bullish').length;
  const bearCount = sorted.filter((n) => scoreSentiment(n.headline) === 'bearish').length;
  const overallSentiment =
    bullCount > bearCount + 1 ? 'bullish' :
    bearCount > bullCount + 1 ? 'bearish' : 'mixed';

  const sentimentLabel =
    overallSentiment === 'bullish' ? { text: 'Positive tone', cls: 'text-emerald-400' } :
    overallSentiment === 'bearish' ? { text: 'Negative tone', cls: 'text-red-400' } :
    { text: 'Mixed tone', cls: 'text-amber-400' };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          {symbol} — Recent News
        </h3>
        {sorted.length > 0 && (
          <span className={`text-xs font-medium ${sentimentLabel.cls}`}>
            {sentimentLabel.text}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-600">No recent news available.</p>
      ) : (
        <>
          {/* Digest box */}
          {digest && (
            <div className="rounded-lg bg-gray-800/60 border border-gray-700/50 px-4 py-3 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Latest Context
              </p>
              <p className="text-sm text-gray-200 leading-relaxed">{digest}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span>{sorted[0].source}</span>
                <span>·</span>
                <span>{getTimeAgo(new Date(sorted[0].datetime * 1000))}</span>
              </div>
            </div>
          )}

          {/* Sentiment tally */}
          <div className="flex gap-3 mb-4">
            <SentimentPill label="Positive" count={bullCount} color="text-emerald-400" dot="bg-emerald-400" />
            <SentimentPill label="Negative" count={bearCount} color="text-red-400" dot="bg-red-400" />
            <SentimentPill
              label="Neutral"
              count={sorted.length - bullCount - bearCount}
              color="text-gray-400"
              dot="bg-gray-500"
            />
          </div>

          {/* Article list */}
          <div className="space-y-3">
            {sorted.map((item) => (
              <NewsArticle key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SentimentPill({
  label, count, color, dot,
}: {
  label: string; count: number; color: string; dot: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className={color}>{count} {label}</span>
    </div>
  );
}

function NewsArticle({ item }: { item: NewsItem }) {
  const sentiment = scoreSentiment(item.headline);
  const date = new Date(item.datetime * 1000);
  const timeAgo = getTimeAgo(date);
  const summary = item.summary?.trim();
  // Truncate summary to ~160 chars
  const shortSummary = summary && summary.length > 160
    ? summary.slice(0, 157) + '…'
    : summary;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer noopener"
      className="block group hover:bg-gray-800/40 rounded-lg p-3 -mx-1 transition"
    >
      <div className="flex items-start gap-2.5">
        {/* Sentiment dot */}
        <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${SENTIMENT_DOT[sentiment]}`} />

        <div className="flex-1 min-w-0">
          {/* Headline */}
          <p className="text-sm text-gray-200 font-medium leading-snug group-hover:text-white transition">
            {item.headline}
          </p>

          {/* Summary — only show if it adds new info beyond the headline */}
          {shortSummary && shortSummary.toLowerCase() !== item.headline.toLowerCase() && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
              {shortSummary}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded ${SENTIMENT_STYLE[sentiment]}`}>
              {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
            </span>
            <span className="text-xs text-gray-600">{item.source}</span>
            <span className="text-gray-700 text-xs">·</span>
            <span className="text-xs text-gray-600">{timeAgo}</span>
          </div>
        </div>

        {/* Thumbnail */}
        {item.image && (
          <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-gray-800 hidden sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt=""
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
      </div>
    </a>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
