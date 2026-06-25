import { CheckCircle, Upload, MessageSquare, Lock, GitBranch } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityItem, ActivityType } from "@/types";
import { formatRelativeTime } from "@/utils/formatters";

const ACTIVITY_META: Record<ActivityType, { label: string; icon: typeof CheckCircle; className: string }> = {
  approved: { label: "Approved", icon: CheckCircle, className: "text-success" },
  uploaded: { label: "Uploaded", icon: Upload, className: "text-info" },
  commented: { label: "Commented", icon: MessageSquare, className: "text-foreground/70" },
  locked: { label: "Locked", icon: Lock, className: "text-warning" },
  created: { label: "Created", icon: GitBranch, className: "text-info" },
};

export function ActivityList({ items }: { items: ActivityItem[] | null }) {
  if (!items) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="relative">
        <div className="absolute bottom-0 left-3 top-0 w-px bg-border" />
        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const meta = ACTIVITY_META[item.type];
            const Icon = meta.icon;
            return (
              <div key={item.id} className="flex gap-4">
                <div className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                  <Icon className={`size-2.5 ${meta.className}`} />
                </div>
                <div className="flex-1 pb-0.5">
                  <p className="text-sm">
                    <span className="font-medium">{item.actor}</span>{" "}
                    <span className="text-muted-foreground">{meta.label}</span>
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{item.version}</span>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(item.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
