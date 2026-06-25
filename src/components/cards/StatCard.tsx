import { FileText, Clock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardStat } from "@/types";

const ICONS = {
  document: FileText,
  clock: Clock,
  check: CheckCircle2,
} as const;

export function StatCard({ stat }: { stat: DashboardStat }) {
  const Icon = ICONS[stat.icon];

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <Icon className="size-4 text-muted-foreground" />
        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          {stat.delta}
        </span>
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
        <p className="text-sm text-muted-foreground">{stat.label}</p>
      </div>
    </Card>
  );
}
