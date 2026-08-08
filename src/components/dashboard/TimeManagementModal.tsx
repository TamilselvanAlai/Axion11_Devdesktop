import { useEffect, useMemo, useState } from "react";
import { Clock, MonitorSmartphone, FileEdit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { workSessionService, type WorkSessionRangeSummary } from "@/services/workSession.service";
import { formatDuration } from "@/utils/formatters";
import { rangeForPeriod, type ReportPeriod } from "@/utils/reportPeriods";

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
};

export function TimeManagementModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [period, setPeriod] = useState<ReportPeriod>("today");
  const [summary, setSummary] = useState<WorkSessionRangeSummary | null>(null);

  const range = useMemo(() => rangeForPeriod(period), [period]);

  // Reset to "Today" each time the modal is reopened, rather than remembering the last tab —
  // matches AssetsEditedModal's behavior for the same reason.
  useEffect(() => {
    if (open) setPeriod("today");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSummary(null);
    let cancelled = false;
    const fetch =
      period === "today"
        ? workSessionService.getTodaySummary().then((s) => ({
            activeSeconds: s.activeSecondsToday,
            timeInAppSeconds: s.timeInAppSecondsToday,
            assetsEditedCount: s.assetsEditedToday,
          }))
        : workSessionService.getRangeSummary(range.from, range.to);
    fetch.then((data) => {
      if (!cancelled) setSummary(data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, period, range.from, range.to]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle>Time Management — {PERIOD_LABEL[period]}</DialogTitle>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
              <TabsList>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <p className="text-sm text-muted-foreground">
            Two different idle bars, on purpose — see below.
          </p>
        </DialogHeader>

        {summary === null ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <FileEdit className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Active Editing Time</p>
                <p className="text-xs text-muted-foreground">Excludes gaps over 10 minutes with no input</p>
              </div>
              <span className="shrink-0 font-mono text-lg font-semibold">
                {formatDuration(summary.activeSeconds * 1000)}
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <MonitorSmartphone className="size-4 shrink-0 text-info" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Time In App</p>
                <p className="text-xs text-muted-foreground">Excludes gaps over 3 minutes with no input</p>
              </div>
              <span className="shrink-0 font-mono text-lg font-semibold">
                {formatDuration(summary.timeInAppSeconds * 1000)}
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Assets Edited</p>
              </div>
              <span className="shrink-0 font-mono text-lg font-semibold">{summary.assetsEditedCount}</span>
            </div>

            <p className="px-1 pt-1 text-[11px] text-muted-foreground">
              Time In App uses a stricter idle cutoff than Active Editing Time, so it can read lower —
              a 4–10 minute pause still counts as active editing, but not as time in app.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
