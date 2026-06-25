import { Box, Clock } from "lucide-react";
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
  pending: "bg-muted text-muted-foreground",
  "in-production": "bg-blue-500/10 text-blue-500",
  "in-review": "bg-amber-500/10 text-amber-500",
  qc: "bg-emerald-500/10 text-emerald-500",
  completed: "bg-muted text-muted-foreground",
};

const DOT_COLOR: Record<string, string> = {
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  slate: "bg-slate-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export function WorkListSection({ items }: { items: WorkItem[] | null }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Box className="size-4 text-primary" /> Work List
        </h2>
        <span className="text-xs text-muted-foreground">Soonest first</span>
      </div>

      <div className="flex flex-col gap-3">
        {!items
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)
          : items.map((item) => (
              <div key={item.id} className="flex flex-col gap-1.5 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${DOT_COLOR[item.accentColor] ?? "bg-muted-foreground"}`} />
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {item.progress.done}/{item.progress.total}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" /> {formatDate(item.dueDate)}
                    </span>
                  </div>
                </div>
                {item.progress.total > 0 && (
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${DOT_COLOR[item.accentColor] ?? "bg-primary"}`}
                      style={{ width: `${(item.progress.done / item.progress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
      </div>
    </Card>
  );
}
