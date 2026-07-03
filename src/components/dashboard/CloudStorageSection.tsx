import { HardDrive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StorageDonutChart } from "@/components/charts/StorageDonutChart";
import type { StorageSummary, StorageColor } from "@/types";

const DOT_HEX: Record<StorageColor, string> = {
  primary: "#1D7CFF",
  info: "#4F8BFF",
  warning: "#F8B400",
  neutral: "rgba(255,255,255,0.1)",
};

function formatStorage(gb: number) {
  return gb >= 1000 ? `${(gb / 1000).toFixed(1)} TB` : `${gb} GB`;
}

export function CloudStorageSection({ storage }: { storage: StorageSummary | null }) {
  if (!storage) {
    return <Skeleton className="h-80 rounded-xl" />;
  }

  return (
    <Card className="flex h-full flex-col gap-3 p-3.5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <HardDrive className="size-4 text-primary" /> Cloud Storage
        </h2>
        <span className="text-xs text-muted-foreground">{storage.quotaTb} TB quota</span>
      </div>

      <div className="flex items-center justify-center py-1">
        <StorageDonutChart
          breakdown={storage.breakdown}
          totalGb={storage.quotaTb * 1000}
          usedPercent={storage.usedPercent}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {storage.breakdown.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-sm" style={{ backgroundColor: DOT_HEX[item.color] }} />
              {item.label}
            </span>
            <span className="font-mono font-medium">{formatStorage(item.valueGb)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
