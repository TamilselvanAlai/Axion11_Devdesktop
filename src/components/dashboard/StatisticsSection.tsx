import { StatCard } from "@/components/cards/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStat } from "@/types";

export function StatisticsSection({ stats }: { stats: DashboardStat[] | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}
