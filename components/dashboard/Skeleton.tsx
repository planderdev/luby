/**
 * Reusable shimmer block. Single source of truth for loading skeletons across
 * the dashboard so they all share the same look and theme tokens.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-2xl bg-muted ${className}`}
    />
  );
}

export function PageHeaderSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="mt-3 h-9 w-64 rounded-xl" />
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-3xl glass-card"
        >
          <Skeleton className="aspect-[16/9] rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RowListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-8 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  );
}
