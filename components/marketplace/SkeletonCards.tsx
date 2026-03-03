'use client';

export function SkeletonCarteStructure() {
  return (
    <div className="flex-shrink-0 w-36 snap-start animate-pulse">
      <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-3">
        <div className="w-14 h-14 rounded-full bg-gray-300/20 mx-auto mb-2" />
        <div className="h-3 bg-gray-300/20 rounded w-3/4 mx-auto mb-1.5" />
        <div className="h-2.5 bg-gray-300/20 rounded w-1/2 mx-auto mb-2" />
        <div className="h-7 bg-gray-300/20 rounded-lg w-full" />
      </div>
    </div>
  );
}

export function SkeletonCarteProduit() {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/10">
      <div className="aspect-square bg-gray-300/20" />
      <div className="p-2.5 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="h-4 bg-gray-300/20 rounded" />
          <div className="h-4 bg-gray-300/20 rounded" />
        </div>
        <div className="h-3 bg-gray-300/20 rounded w-3/4" />
        <div className="h-2.5 bg-gray-300/20 rounded w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonSearchBar() {
  return (
    <div className="animate-pulse w-full max-w-xl mx-auto">
      <div className="h-12 bg-white/10 rounded-full border border-white/10" />
    </div>
  );
}
