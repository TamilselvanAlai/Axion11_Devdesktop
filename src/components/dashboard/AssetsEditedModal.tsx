import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { assetEditSessionService, type AssetEditSessionEntry } from "@/services/assetEditSession.service";
import { formatDuration } from "@/utils/formatters";

const END_REASON_LABEL: Record<AssetEditSessionEntry["endReason"], string> = {
  SAVED: "Saved",
  SWITCHED: "Switched away before saving",
  SESSION_END: "App closed before saving",
};

function formatTimeRange(startedAt: string, endedAt: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${new Date(startedAt).toLocaleTimeString("en-US", opts)} – ${new Date(endedAt).toLocaleTimeString("en-US", opts)}`;
}

export function AssetsEditedModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [entries, setEntries] = useState<AssetEditSessionEntry[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setEntries(null);
    let cancelled = false;
    assetEditSessionService.getToday().then((data) => {
      if (!cancelled) setEntries(data);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const totalSeconds = entries?.reduce((sum, e) => sum + e.durationSeconds, 0) ?? 0;
  const savedCount = entries?.filter((e) => e.endReason === "SAVED").length ?? 0;
  const notSavedCount = (entries?.length ?? 0) - savedCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assets Edited Today</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {entries && entries.length > 0
              ? // The dashboard's "Assets Edited" count only includes completed saves — call out
                // not-saved sessions separately here rather than implying all of these finished.
                `${savedCount} saved${notSavedCount > 0 ? ` · ${notSavedCount} not saved` : ""} · ${formatDuration(totalSeconds * 1000)} total`
              : "Time spent per asset, from open to save."}
          </p>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
          {entries === null &&
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}

          {entries !== null && entries.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Clock className="size-6" />
              <p className="text-sm">No assets edited yet today.</p>
            </div>
          )}

          {entries?.map((entry, i) => (
            <div
              key={`${entry.assetId}-${entry.endedAt}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-border px-2.5 py-2"
            >
              <AssetThumbnail color={entry.thumbnailUrl ?? "neutral"} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTimeRange(entry.startedAt, entry.endedAt)}
                  {" · "}
                  <span className={entry.endReason === "SAVED" ? "text-success" : ""}>
                    {END_REASON_LABEL[entry.endReason]}
                  </span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-mono text-sm font-semibold">{formatDuration(entry.durationSeconds * 1000)}</span>
                {entry.version && <span className="text-[10px] text-muted-foreground">v{entry.version}</span>}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
