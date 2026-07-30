import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
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

export type AssetUploadPhase = "uploading" | "processing";

const PHASE_LABEL: Record<AssetUploadPhase, string> = {
  uploading: "Uploading…",
  processing: "Processing…",
};

/** Per-file placeholder shown from the instant a file starts uploading through server-side
 *  processing (AI tagging/preview generation) — same card shape as the real asset Card the
 *  moment it's replaced, so the grid never looks "empty" in between. See useFileUpload /
 *  ProjectDetailView, which clears these (and refreshes the real list) once the batch completes. */
export function AssetUploadingGridTile({ name, phase }: { name: string; phase: AssetUploadPhase }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-primary/5",
        phase === "uploading" ? "border-primary/30" : "border-violet-500/30"
      )}
    >
      <div className="relative flex h-40 w-full items-center justify-center overflow-hidden bg-muted/40">
        <Skeleton className="absolute inset-0 rounded-none" />
        <Loader2 className={cn("relative z-10 size-5 animate-spin", phase === "uploading" ? "text-primary" : "text-violet-400")} />
      </div>
      <div className="flex flex-col gap-1 p-3">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className={cn("text-xs font-medium", phase === "uploading" ? "text-primary" : "text-violet-400")}>
          {PHASE_LABEL[phase]}
        </p>
      </div>
    </div>
  );
}

export function AssetUploadingTableRow({ name, phase }: { name: string; phase: AssetUploadPhase }) {
  return (
    <TableRow className={cn(phase === "uploading" ? "bg-primary/5 hover:bg-primary/5" : "bg-violet-500/5 hover:bg-violet-500/5")}>
      <TableCell />
      <TableCell colSpan={7}>
        <div className="flex min-w-0 items-center gap-2">
          <Loader2 className={cn("size-3.5 shrink-0 animate-spin", phase === "uploading" ? "text-primary" : "text-violet-400")} />
          <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
          <span className={cn("shrink-0 text-xs font-medium", phase === "uploading" ? "text-primary" : "text-violet-400")}>
            {PHASE_LABEL[phase]}
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}
