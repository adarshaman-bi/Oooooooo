import React from 'react';

/**
 * TeacherProfileSkeleton - Mirrors the TeacherProfileDetail layout
 * Supports both dark mode (animate-pulse) and light mode (skeleton-shimmer)
 */
export default function TeacherProfileSkeleton() {
  return (
    <div className="min-h-screen pb-20 select-none">
      {/* Top Header Bar */}
      <div className="px-6 md:px-16 py-4 flex items-center gap-4 border-b border-zinc-800 light-theme-border">
        <div className="w-16 h-4 rounded bg-zinc-800 animate-pulse skeleton" />
        <div className="h-4 w-px bg-zinc-800" />
        <div className="w-40 h-3 rounded bg-zinc-800 animate-pulse skeleton" />
      </div>

      {/* Hero Banner Section */}
      <section className="w-full px-6 md:px-16 py-12 bg-zinc-900/40 border-b border-zinc-800">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Avatar Placeholder */}
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-full md:rounded-2xl bg-zinc-800 animate-pulse skeleton" />
          </div>

          {/* Info Placeholders */}
          <div className="flex flex-col gap-3 flex-1 justify-center items-center md:items-start">
            {/* Name */}
            <div className="w-52 h-7 rounded-lg bg-zinc-800 animate-pulse skeleton" />
            {/* Subject */}
            <div className="w-36 h-4 rounded bg-zinc-800 animate-pulse skeleton" />
            {/* Institute */}
            <div className="w-48 h-3.5 rounded bg-zinc-800 animate-pulse skeleton" />

            {/* Meta row */}
            <div className="flex items-center gap-4 mt-2">
              <div className="w-20 h-3 rounded bg-zinc-800 animate-pulse skeleton" />
              <div className="w-px h-3 bg-zinc-800" />
              <div className="w-16 h-3 rounded bg-zinc-800 animate-pulse skeleton" />
            </div>

            {/* Bio lines */}
            <div className="w-full max-w-xl space-y-2 mt-3">
              <div className="w-full h-3 rounded bg-zinc-800 animate-pulse skeleton" />
              <div className="w-[85%] h-3 rounded bg-zinc-800 animate-pulse skeleton" />
              <div className="w-[60%] h-3 rounded bg-zinc-800 animate-pulse skeleton" />
            </div>

            {/* Subject chips */}
            <div className="flex gap-2 mt-3">
              <div className="w-20 h-6 rounded-full bg-zinc-800 animate-pulse skeleton" />
              <div className="w-24 h-6 rounded-full bg-zinc-800 animate-pulse skeleton" />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-4">
              <div className="w-28 h-10 rounded-full bg-zinc-800 animate-pulse skeleton" />
              <div className="w-28 h-10 rounded-full bg-zinc-800 animate-pulse skeleton" />
              <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse skeleton" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <div className="w-full grid grid-cols-2 md:grid-cols-5 border-b border-zinc-800">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`flex flex-col items-center py-6 gap-2 ${
              i < 4 ? 'border-r border-zinc-800' : ''
            } ${i < 2 ? 'border-b md:border-b-0 border-zinc-800' : ''}`}
          >
            <div className="w-4 h-4 rounded bg-zinc-800 animate-pulse skeleton" />
            <div className="w-12 h-6 rounded bg-zinc-800 animate-pulse skeleton" />
            <div className="w-16 h-2.5 rounded bg-zinc-800 animate-pulse skeleton" />
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-6 md:px-16 py-4 border-b border-zinc-800 overflow-x-auto">
        {[80, 96, 72, 88].map((width, i) => (
          <div
            key={i}
            className="h-9 rounded-lg bg-zinc-800 animate-pulse skeleton"
            style={{ width: `${width}px`, minWidth: `${width}px` }}
          />
        ))}
      </div>

      {/* Content Area Placeholder */}
      <div className="px-6 md:px-16 py-8 space-y-6">
        {/* Section header */}
        <div className="w-44 h-5 rounded bg-zinc-800 animate-pulse skeleton" />

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/40"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-zinc-800 animate-pulse skeleton" />
              {/* Text area */}
              <div className="p-4 space-y-3">
                <div className="w-[80%] h-3.5 rounded bg-zinc-800 animate-pulse skeleton" />
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 animate-pulse skeleton" />
                  <div className="w-24 h-2.5 rounded bg-zinc-800 animate-pulse skeleton" />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                  <div className="w-12 h-2.5 rounded bg-zinc-800 animate-pulse skeleton" />
                  <div className="w-16 h-2.5 rounded bg-zinc-800 animate-pulse skeleton" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
