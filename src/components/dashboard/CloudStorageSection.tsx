import { CloudCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StorageDonutChart } from "@/components/charts/StorageDonutChart";
import type { StorageSummary } from "@/types";

const DOT_COLOR: Record<string, string> = {
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  muted: "bg-muted-foreground/40",
};

function formatStorage(gb: number) {
  return gb >= 1000 ? `${(gb / 1000).toFixed(1)} TB` : `${gb} GB`;
}

export function CloudStorageSection({ storage }: { storage: StorageSummary | null }) {
  if (!storage) {
    return <Skeleton className="h-80 rounded-xl" />;
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CloudCog className="size-4 text-primary" /> Cloud Storage
        </h2>
        <span className="text-xs text-muted-foreground">{storage.quotaTb} TB quota</span>
      </div>

      <div className="flex items-center justify-center py-2">
        <StorageDonutChart usedPercent={storage.usedPercent} />
      </div>

      <div className="flex flex-col gap-2.5">
        {storage.breakdown.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className={`size-2 rounded-full ${DOT_COLOR[item.color] ?? "bg-muted-foreground"}`} />
              {item.label}
            </span>
            <span className="font-medium">{formatStorage(item.valueGb)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
