import { Skeleton } from "@/components/dashboard/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-4 w-20" />
      <div className="mt-4 rounded-3xl glass-card p-6 lg:p-8">
        <div className="flex items-start gap-5">
          <Skeleton className="size-20 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-3 h-4 w-64" />
            <Skeleton className="mt-2 h-4 w-80" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
      <Skeleton className="mt-10 h-6 w-24" />
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
