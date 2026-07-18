import { FileText, Clock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStatCards } from "@/types";

function DeltaBadge({ delta }: { delta: string }) {
  return (
    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">{delta}</span>
  );
}

export function StatisticsSection({
  stats,
  onAssetsEditedClick,
}: {
  stats: DashboardStatCards | null;
  onAssetsEditedClick?: () => void;
}) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card
        onClick={onAssetsEditedClick}
        className="flex flex-col gap-2 p-3.5 transition-colors hover:bg-muted/50 cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <FileText className="size-3.5 text-muted-foreground" />
          <DeltaBadge delta={stats.assetsEdited.delta} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">Assets Edited</p>
          <p className="mt-0.5 text-xl font-semibold tracking-tight">{stats.assetsEdited.value}</p>
          <p className="text-xs text-muted-foreground">{stats.assetsEdited.description}</p>
        </div>
      </Card>

      <Card className="flex flex-col gap-2 p-3.5">
        <div className="flex items-center justify-between">
          <Clock className="size-3.5 text-muted-foreground" />
          <DeltaBadge delta={stats.timeManagement.delta} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">Time Management</p>
          <p className="mt-0.5 text-xl font-semibold tracking-tight">{stats.timeManagement.value}</p>
          <p className="text-xs text-muted-foreground">{stats.timeManagement.description}</p>
        </div>
      </Card>

      <Card className="flex flex-col gap-2 p-3.5">
        <div className="flex items-center justify-between">
          <CheckCircle2 className="size-3.5 text-muted-foreground" />
          <DeltaBadge delta={stats.tasks.delta} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">Tasks</p>
          <div className="mt-0.5 flex items-baseline gap-3">
            <span className="text-xl font-semibold tracking-tight">{stats.tasks.completed}</span>
            <span className="text-xl font-semibold tracking-tight text-warning">{stats.tasks.pending}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Completed</span>
            <span>Pending</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
