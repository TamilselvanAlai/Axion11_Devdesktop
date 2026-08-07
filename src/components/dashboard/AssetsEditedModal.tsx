import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { assetEditSessionService, type AssetEditSessionEntry } from "@/services/assetEditSession.service";
import { formatDuration, parseBackendTimestamp } from "@/utils/formatters";
import { rangeForPeriod, type ReportPeriod } from "@/utils/reportPeriods";

const END_REASON_LABEL: Record<AssetEditSessionEntry["endReason"], string> = {
  SAVED: "Saved",
  SWITCHED: "Switched away before saving",
  SESSION_END: "App closed before saving",
};

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
};

function formatTimeRange(startedAt: string, endedAt: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${parseBackendTimestamp(startedAt).toLocaleTimeString(undefined, opts)} – ${parseBackendTimestamp(endedAt).toLocaleTimeString(undefined, opts)}`;
}

export function AssetsEditedModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [period, setPeriod] = useState<ReportPeriod>("today");
  const [entries, setEntries] = useState<AssetEditSessionEntry[] | null>(null);

  const range = useMemo(() => rangeForPeriod(period), [period]);

  // Reset to "Today" each time the modal is reopened, rather than remembering the last tab —
  // "today" is the default the dashboard card itself represents, so that's the expected view on
  // open; the week/month tabs are there to look further back on demand, not to persist as state.
  useEffect(() => {
    if (open) setPeriod("today");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setEntries(null);
    let cancelled = false;
    const fetch = period === "today" ? assetEditSessionService.getToday() : assetEditSessionService.getRange(range.from, range.to);
    fetch.then((data) => {
      if (!cancelled) setEntries(data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, period, range.from, range.to]);

  const totalSeconds = entries?.reduce((sum, e) => sum + e.durationSeconds, 0) ?? 0;
  const savedCount = entries?.filter((e) => e.endReason === "SAVED").length ?? 0;
  const notSavedCount = (entries?.length ?? 0) - savedCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle>Assets Edited — {PERIOD_LABEL[period]}</DialogTitle>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
              <TabsList>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
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
              <p className="text-sm">No assets edited in this period.</p>
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
                {entry.idleSecondsExcluded >= 60 && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatDuration(entry.idleSecondsExcluded * 1000)} idle excluded
                  </span>
                )}
                {entry.version && <span className="text-[10px] text-muted-foreground">v{entry.version}</span>}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
