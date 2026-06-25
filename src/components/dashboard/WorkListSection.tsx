import { Package, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkItem } from "@/types";

const STATUS_LABEL: Record<WorkItem["status"], string> = {
  pending: "Pending",
  "in-production": "In Production",
  "in-review": "In Review",
  qc: "QC",
  completed: "Completed",
};

const STATUS_BADGE_CLASS: Record<WorkItem["status"], string> = {
  pending: "bg-white/5 text-foreground/70",
  "in-production": "bg-success/10 text-success",
  "in-review": "bg-warning/10 text-warning",
  qc: "bg-info/10 text-info",
  completed: "bg-muted text-muted-foreground",
};

function daysUntil(iso: string) {
  return (new Date(iso).getTime() - Date.now()) / 86_400_000;
}

function urgencyHex(item: WorkItem) {
  if (item.progress.done >= item.progress.total) return "#6B7280";
  const days = daysUntil(item.dueDate);
  if (days < 0) return "#6B7280";
  if (days < 1) return "#FF5C5C";
  if (days < 3) return "#F8B400";
  if (days < 7) return "#23C16B";
  return "#1D7CFF";
}

function etaTextClass(item: WorkItem) {
  if (item.progress.done >= item.progress.total) return "text-muted-foreground";
  const days = daysUntil(item.dueDate);
  if (days < 0) return "text-muted-foreground";
  if (days < 1) return "text-danger";
  if (days < 3) return "text-warning";
  if (days < 7) return "text-success";
  return "text-info";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export function WorkListSection({ items }: { items: WorkItem[] | null }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Package className="size-4 text-primary" /> Work List
        </h2>
        <span className="text-xs text-muted-foreground">Soonest first</span>
      </div>

      <div className="flex flex-col gap-3">
        {!items
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)
          : items.map((item) => {
              const color = urgencyHex(item);
              return (
                <div key={item.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                      <span className="truncate text-sm font-medium">{item.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[item.status]}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">
                        {item.progress.done}/{item.progress.total}
                      </span>
                      <span className={`flex items-center gap-1 font-mono ${etaTextClass(item)}`}>
                        <Clock className="size-3.5" /> {formatDate(item.dueDate)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(item.progress.done / item.progress.total) * 100}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
      </div>
    </Card>
  );
}
