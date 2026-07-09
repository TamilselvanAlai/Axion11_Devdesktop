import { CheckCircle, Upload, Download, MessageSquare, Lock, GitBranch, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityItem, ActivityType } from "@/types";
import { formatRelativeTime } from "@/utils/formatters";

const ACTIVITY_META: Record<
  ActivityType,
  { label: string; icon: typeof CheckCircle; iconClassName: string; badgeClassName: string }
> = {
  approved: {
    label: "Approved",
    icon: CheckCircle,
    iconClassName: "text-white",
    badgeClassName: "border-success bg-success",
  },
  uploaded: {
    label: "Uploaded",
    icon: Upload,
    iconClassName: "text-info",
    badgeClassName: "border-info/40 bg-background",
  },
  commented: {
    label: "Commented",
    icon: MessageSquare,
    iconClassName: "text-slate-300",
    badgeClassName: "border-slate-400/40 bg-background",
  },
  locked: {
    label: "Locked",
    icon: Lock,
    iconClassName: "text-warning",
    badgeClassName: "border-warning/40 bg-background",
  },
  created: {
    label: "Created",
    icon: GitBranch,
    iconClassName: "text-violet-400",
    badgeClassName: "border-violet-400/40 bg-background",
  },
  viewed: {
    label: "Viewed",
    icon: Eye,
    iconClassName: "text-cyan-400",
    badgeClassName: "border-cyan-400/40 bg-background",
  },
  downloaded: {
    label: "Downloaded",
    icon: Download,
    iconClassName: "text-pink-400",
    badgeClassName: "border-pink-400/40 bg-background",
  },
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
    <div className="p-3">
      <div className="relative">
        <div className="absolute bottom-0 left-2.5 top-0 w-px bg-border" />
        <div className="flex flex-col gap-2.5">
          {items.map((item) => {
            const meta = ACTIVITY_META[item.type];
            const Icon = meta.icon;
            return (
              <div key={item.id} className="flex gap-2.5">
                <div className={`z-10 flex size-5 shrink-0 items-center justify-center rounded-full border ${meta.badgeClassName}`}>
                  <Icon className={`size-2.5 ${meta.iconClassName}`} />
                </div>
                <div className="flex-1 pb-0.5">
                  <p className="text-xs">
                    <span className="font-medium">{item.actor}</span>{" "}
                    <span className="text-muted-foreground">{meta.label}</span>
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{item.version}</span>
                    <span className="text-[10px] text-muted-foreground">{formatRelativeTime(item.timestamp)}</span>
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
