import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableRow, TableCell } from "@/components/ui/table";
import type { AssetViewMode } from "@/types";

export function AssetsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 @min-[560px]:grid-cols-3 @min-[820px]:grid-cols-4 @min-[1080px]:grid-cols-5">
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

/** Per-file placeholder shown the instant a file starts uploading (in-flight request, before
 *  any server-side row exists) — so the grid reflects the upload immediately instead of looking
 *  unchanged until the batch is accepted and a later poll happens to land. See useFileUpload /
 *  ProjectDetailView. */
export function AssetUploadingGridTile({ name }: { name: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
      <div className="relative flex h-40 w-full items-center justify-center overflow-hidden bg-muted/40">
        <Skeleton className="absolute inset-0 rounded-none" />
        <Loader2 className="relative z-10 size-5 animate-spin text-primary" />
      </div>
      <div className="flex flex-col gap-1 p-3">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs font-medium text-primary">Uploading…</p>
      </div>
    </div>
  );
}

export function AssetUploadingTableRow({ name }: { name: string }) {
  return (
    <TableRow className="bg-primary/5 hover:bg-primary/5">
      <TableCell />
      <TableCell colSpan={7}>
        <div className="flex min-w-0 items-center gap-2">
          <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
          <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
          <span className="shrink-0 text-xs font-medium text-primary">Uploading…</span>
        </div>
      </TableCell>
    </TableRow>
  );
}
