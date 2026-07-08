export function SearchResultsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl animate-pulse">
          <div className="w-16 h-16 rounded-lg bg-zinc-800 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
            <div className="h-3 bg-zinc-800 rounded w-1/2" />
            <div className="h-2.5 bg-zinc-800 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden animate-pulse">
          <div className="aspect-video bg-zinc-800" />
          <div className="p-4 space-y-3">
            <div className="h-3.5 bg-zinc-800 rounded w-full" />
            <div className="h-3.5 bg-zinc-800 rounded w-2/3" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-zinc-800" />
              <div className="h-3 bg-zinc-800 rounded w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
