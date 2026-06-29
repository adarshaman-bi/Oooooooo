import React from 'react';

type CardSkeletonVariant = 'teacher' | 'lecture' | 'playlist' | 'batch' | 'institute';

interface CardSkeletonProps {
  variant?: CardSkeletonVariant;
  count?: number;
}

/**
 * Shimmer block helper - uses both animate-pulse (dark) and skeleton class (light)
 */
function ShimmerBlock({ className }: { className: string }) {
  return <div className={`bg-zinc-800 animate-pulse skeleton ${className}`} />;
}

/**
 * Teacher Card Skeleton - Matches the channel/teacher card layout
 * Circular avatar, name, subject, stats row
 */
function TeacherCardSkeleton() {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center gap-3">
      {/* Avatar */}
      <ShimmerBlock className="w-20 h-20 rounded-full" />
      {/* Name */}
      <ShimmerBlock className="w-32 h-4 rounded" />
      {/* Subject / Subtitle */}
      <ShimmerBlock className="w-24 h-3 rounded" />
      {/* Stats row */}
      <div className="flex gap-6 mt-2">
        <div className="flex flex-col items-center gap-1">
          <ShimmerBlock className="w-8 h-5 rounded" />
          <ShimmerBlock className="w-12 h-2 rounded" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <ShimmerBlock className="w-8 h-5 rounded" />
          <ShimmerBlock className="w-12 h-2 rounded" />
        </div>
      </div>
      {/* Action button */}
      <ShimmerBlock className="w-full h-9 rounded-xl mt-2" />
    </div>
  );
}

/**
 * Lecture Card Skeleton - Matches the LectureCard layout
 * 16:9 thumbnail, title, channel row, footer stats
 */
function LectureCardSkeleton() {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-full">
      {/* Thumbnail */}
      <div className="relative aspect-video">
        <ShimmerBlock className="w-full h-full" />
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2">
          <ShimmerBlock className="w-10 h-4 rounded" />
        </div>
        {/* Subject badge */}
        <div className="absolute top-2 left-2">
          <ShimmerBlock className="w-14 h-4 rounded" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 flex-grow flex flex-col justify-between">
        <div className="space-y-2">
          {/* Title - 2 lines */}
          <ShimmerBlock className="w-full h-3.5 rounded" />
          <ShimmerBlock className="w-[70%] h-3.5 rounded" />

          {/* Channel row */}
          <div className="flex items-center gap-2.5 pt-1">
            <ShimmerBlock className="w-5 h-5 rounded-full shrink-0" />
            <div className="space-y-1 flex-1">
              <ShimmerBlock className="w-24 h-2.5 rounded" />
              <ShimmerBlock className="w-16 h-2 rounded" />
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
          <ShimmerBlock className="w-14 h-2.5 rounded" />
          <ShimmerBlock className="w-20 h-2.5 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Playlist Card Skeleton - Matches PlaylistCard layout
 * Video thumbnail with play overlay, title, subtitle
 */
function PlaylistCardSkeleton() {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden w-full max-w-[320px]">
      {/* Video thumbnail with play */}
      <div className="relative aspect-video">
        <ShimmerBlock className="w-full h-full" />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <ShimmerBlock className="w-12 h-12 rounded-full" />
        </div>
      </div>
      {/* Text */}
      <div className="p-3 space-y-2">
        <ShimmerBlock className="w-[85%] h-3.5 rounded" />
        <ShimmerBlock className="w-[50%] h-2.5 rounded" />
      </div>
    </div>
  );
}

/**
 * Batch Card Skeleton - Matches BatchCard layout
 * Horizontal layout: thumbnail on left, metadata on right
 */
function BatchCardSkeleton() {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
      {/* Thumbnail */}
      <ShimmerBlock className="w-full sm:w-36 aspect-video sm:aspect-square rounded-xl shrink-0" />

      {/* Metadata */}
      <div className="flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          {/* Tags row */}
          <div className="flex justify-between items-center">
            <ShimmerBlock className="w-16 h-4 rounded" />
            <ShimmerBlock className="w-20 h-4 rounded" />
          </div>
          {/* Title */}
          <ShimmerBlock className="w-[80%] h-3.5 rounded" />
          {/* Description */}
          <ShimmerBlock className="w-full h-3 rounded" />
          <ShimmerBlock className="w-[60%] h-3 rounded" />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
          <ShimmerBlock className="w-16 h-3 rounded" />
          <ShimmerBlock className="w-20 h-5 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Institute Card Skeleton - Matches InstituteCard layout
 * Banner, overlapping logo, name, description, rating, CTA
 */
function InstituteCardSkeleton() {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
      {/* Banner */}
      <ShimmerBlock className="w-full h-28" />

      {/* Content */}
      <div className="px-5 pb-5 pt-3 flex flex-col flex-grow gap-4">
        <div className="space-y-3">
          {/* Logo + Trust score row */}
          <div className="flex justify-between items-end -mt-10 relative z-10">
            <ShimmerBlock className="w-14 h-14 rounded-full border-[3px] border-zinc-900" />
            <div className="text-right space-y-1">
              <ShimmerBlock className="w-16 h-2 rounded" />
              <ShimmerBlock className="w-14 h-4 rounded" />
            </div>
          </div>

          {/* Exam tags */}
          <div className="flex gap-1.5">
            <ShimmerBlock className="w-10 h-4 rounded" />
            <ShimmerBlock className="w-10 h-4 rounded" />
          </div>

          {/* Name */}
          <ShimmerBlock className="w-[70%] h-3.5 rounded" />
          {/* Established label */}
          <ShimmerBlock className="w-28 h-2 rounded" />
          {/* Description */}
          <ShimmerBlock className="w-full h-3 rounded" />
          <ShimmerBlock className="w-[75%] h-3 rounded" />
        </div>

        {/* Rating & CTA */}
        <div className="space-y-3 pt-3 border-t border-zinc-800">
          <div className="flex justify-between items-center">
            <ShimmerBlock className="w-10 h-3 rounded" />
            <ShimmerBlock className="w-16 h-2.5 rounded" />
          </div>
          <ShimmerBlock className="w-full h-8 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * CardSkeleton - Reusable card skeleton with multiple variants
 *
 * @param variant - 'teacher' | 'lecture' | 'playlist' | 'batch' | 'institute'
 * @param count - Number of skeleton cards to render (defaults to 1)
 */
export default function CardSkeleton({ variant = 'lecture', count = 1 }: CardSkeletonProps) {
  const SkeletonComponent = {
    teacher: TeacherCardSkeleton,
    lecture: LectureCardSkeleton,
    playlist: PlaylistCardSkeleton,
    batch: BatchCardSkeleton,
    institute: InstituteCardSkeleton,
  }[variant];

  return (
    <>
      {[...Array(count)].map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </>
  );
}

// Also export individual skeletons for direct use
export {
  TeacherCardSkeleton,
  LectureCardSkeleton,
  PlaylistCardSkeleton,
  BatchCardSkeleton,
  InstituteCardSkeleton,
};
