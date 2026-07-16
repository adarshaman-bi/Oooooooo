import React from 'react';
import { MessageSquare, ShieldCheck, Star } from 'lucide-react';
import { RatingScorecard } from '../types';

interface ScorecardSummaryProps {
  scorecard?: RatingScorecard | null;
  className?: string;
  variant?: 'compact' | 'inline' | 'panel';
  trustScale?: 'percent' | 'ten';
}

const emptyScorecard: RatingScorecard = {
  rating: null,
  trustScore: null,
  reviewCount: 0,
  positiveReviewCount: 0,
  sourceEntityIds: [],
};

function formatTrust(score: number, scale: 'percent' | 'ten') {
  if (scale === 'ten') {
    return `${(score / 10).toFixed(1)}/10`;
  }
  return `${Math.round(score)}%`;
}

export function ScorecardSummary({
  scorecard,
  className = '',
  variant = 'compact',
  trustScale = 'percent',
}: ScorecardSummaryProps) {
  const stats = scorecard || emptyScorecard;
  const hasReviews = stats.reviewCount > 0 && stats.rating != null && stats.trustScore != null;

  if (variant === 'panel') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono font-semibold ${className}`}>
        <span className="bg-zinc-900 border border-zinc-850 px-2.5 py-1 rounded-lg text-zinc-300 flex items-center gap-1.5 shadow-sm">
          <Star className={`w-3.5 h-3.5 ${hasReviews ? 'text-amber-500 fill-amber-500' : 'text-zinc-600'}`} />
          {hasReviews ? `Rating: ${stats.rating!.toFixed(1)}` : 'No ratings yet'}
        </span>
        <span className="bg-zinc-900 border border-zinc-850 px-2.5 py-1 rounded-lg text-zinc-300 flex items-center gap-1.5 shadow-sm">
          <ShieldCheck className={`w-3.5 h-3.5 ${hasReviews ? 'text-emerald-400' : 'text-zinc-600'}`} />
          {hasReviews ? `Trust: ${formatTrust(stats.trustScore!, trustScale)}` : 'Trust pending'}
        </span>
        <span className="bg-zinc-900 border border-zinc-850 px-2.5 py-1 rounded-lg text-zinc-300 flex items-center gap-1.5 shadow-sm">
          <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
          {stats.reviewCount} review{stats.reviewCount === 1 ? '' : 's'}
        </span>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-2 min-w-0 text-[9px] font-mono font-bold text-zinc-500 ${className}`}>
        <span className={`inline-flex items-center gap-0.5 ${hasReviews ? 'text-amber-500/90' : 'text-zinc-600'}`}>
          <Star className={`w-3 h-3 ${hasReviews ? 'fill-amber-500 text-amber-500' : 'text-zinc-600'}`} />
          {hasReviews ? stats.rating!.toFixed(1) : 'No ratings'}
        </span>
        <span className={hasReviews ? 'text-zinc-400' : 'text-zinc-600'}>
          {hasReviews ? `Trust ${formatTrust(stats.trustScore!, trustScale)}` : 'Trust pending'}
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 flex-wrap text-[10px] font-mono font-semibold ${className}`}>
      <span className={`flex items-center gap-0.5 ${hasReviews ? 'text-amber-500/90' : 'text-zinc-600'}`}>
        <Star className={`w-3.5 h-3.5 ${hasReviews ? 'fill-amber-500 text-amber-500' : 'text-zinc-600'}`} />
        {hasReviews ? stats.rating!.toFixed(1) : 'No ratings'}
      </span>
      <span className={`border border-zinc-900 bg-zinc-950 px-1.5 py-0.5 rounded ${hasReviews ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {hasReviews ? `Trust ${formatTrust(stats.trustScore!, trustScale)}` : 'Trust pending'}
      </span>
      <span className="text-zinc-500">
        {stats.reviewCount} review{stats.reviewCount === 1 ? '' : 's'}
      </span>
    </span>
  );
}

export default ScorecardSummary;
