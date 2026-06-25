import { CheckCircle2, Upload, MessageSquare, Lock, FilePlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityItem, ActivityType } from "@/types";
import { formatRelativeTime } from "@/utils/formatters";

const ACTIVITY_META: Record<ActivityType, { label: string; icon: typeof CheckCircle2; className: string }> = {
  approved: { label: "Approved", icon: CheckCircle2, className: "text-emerald-500" },
  uploaded: { label: "Uploaded", icon: Upload, className: "text-blue-500" },
  commented: { label: "Commented", icon: MessageSquare, className: "text-amber-500" },
  locked: { label: "Locked", icon: Lock, className: "text-muted-foreground" },
  created: { label: "Created", icon: FilePlus, className: "text-primary" },
};

export function ActivitySection({ items }: { items: ActivityItem[] | null }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="text-sm font-semibold">History</h2>

      <div className="flex flex-col gap-4">
        {!items
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)
          : items.map((item) => {
              const meta = ACTIVITY_META[item.type];
              const Icon = meta.icon;
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <span className={`mt-0.5 ${meta.className}`}>
                    <Icon className="size-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{item.actor}</span>{" "}
                      <span className="text-muted-foreground">{meta.label}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.version} · {formatRelativeTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
      </div>
    </Card>
  );
}
