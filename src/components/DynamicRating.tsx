import React, { useEffect, useState } from 'react';
import { fetchReviews } from '../services/dbService';
import { Review } from '../types';

interface DynamicRatingProps {
  targetId: string;
  className?: string;
  starClassName?: string;
  textClassName?: string;
  hideCount?: boolean;
  onStatsFetched?: (rating: number | null, count: number) => void;
}

export const DynamicRating: React.FC<DynamicRatingProps> = ({
  targetId,
  className = "flex items-center gap-1 text-xs font-mono text-zinc-400",
  starClassName = "text-[#FFEFD5] font-sans",
  textClassName = "text-zinc-500 uppercase",
  hideCount = false,
  onStatsFetched
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadStats() {
      setLoading(true);
      const data = await fetchReviews(targetId);
      if (active) {
        setReviews(data);
        setLoading(false);
        if (onStatsFetched) {
          if (data.length > 0) {
            const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
            onStatsFetched(sum / data.length, data.length);
          } else {
            onStatsFetched(null, 0);
          }
        }
      }
    }
    loadStats();
    // Listen to custom review submits so we update instantly when a user submits a review
    const handleReviewAdded = () => {
      loadStats();
    };
    window.addEventListener('reviewAdded', handleReviewAdded);
    return () => {
      active = false;
      window.removeEventListener('reviewAdded', handleReviewAdded);
    };
  }, [targetId]);

  if (loading) {
    return <span className={`${className} animate-pulse`}>...</span>;
  }

  if (reviews.length === 0) {
    return (
      <span className={className}>
        No ratings yet
      </span>
    );
  }

  const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
  const avg = sum / reviews.length;

  return (
    <div className={className}>
      <span className={starClassName}>★</span>
      <span className="font-bold text-white font-mono">{avg.toFixed(1)}</span>
      {!hideCount && (
        <span className={textClassName}>
          ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
};
