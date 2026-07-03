import { Skeleton } from "@/components/ui/skeleton";
import type { AssetViewMode } from "@/types";

export function AssetsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border">
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-3.5 w-3/4 rounded" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-8 rounded" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3 w-14 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AssetsTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function AssetsSkeleton({ viewMode }: { viewMode: AssetViewMode }) {
  return viewMode === "grid" ? <AssetsGridSkeleton /> : <AssetsTableSkeleton />;
}
