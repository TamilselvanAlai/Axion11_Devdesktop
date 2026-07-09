import { Bell, CheckCircle, Upload, Download, MessageSquare, Lock, GitBranch, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboard } from "@/hooks/useDashboard";
import { useNotificationsStore } from "@/store/notificationsStore";
import { formatRelativeTime } from "@/utils/formatters";
import type { ActivityItem, ActivityType } from "@/types";

const NOTIFICATION_META: Record<ActivityType, { title: (item: ActivityItem) => string; icon: typeof CheckCircle; className: string }> = {
  approved: { title: (i) => `${i.actor} approved`, icon: CheckCircle, className: "text-success" },
  uploaded: { title: (i) => `${i.actor} uploaded`, icon: Upload, className: "text-info" },
  commented: { title: (i) => `${i.actor} commented`, icon: MessageSquare, className: "text-slate-300" },
  locked: { title: (i) => `${i.actor} locked`, icon: Lock, className: "text-warning" },
  created: { title: (i) => `${i.actor} created`, icon: GitBranch, className: "text-violet-400" },
  viewed: { title: (i) => `${i.actor} viewed`, icon: Eye, className: "text-cyan-400" },
  downloaded: { title: (i) => `${i.actor} downloaded`, icon: Download, className: "text-pink-400" },
};

export function NotificationsMenu() {
  const { snapshot } = useDashboard();
  const { readIds, markAllRead } = useNotificationsStore();
  const items = snapshot?.activity ?? [];
  const hasUnread = items.some((item) => !readIds.includes(item.id));

  return (
    <DropdownMenu onOpenChange={(open) => open && markAllRead(items.map((i) => i.id))}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <Bell className="size-3" />
          {hasUnread && <span className="absolute right-1.5 top-1.5 size-1 rounded-full bg-primary" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          <button
            type="button"
            onClick={() => markAllRead(items.map((i) => i.id))}
            className="text-xs font-medium text-primary hover:underline"
          >
            Mark all read
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications yet.</p>
          ) : (
            items.map((item) => {
              const meta = NOTIFICATION_META[item.type];
              const Icon = meta.icon;
              return (
                <div key={item.id} className="flex items-start gap-2.5 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-muted">
                  <Icon className={`mt-0.5 size-4 shrink-0 ${meta.className}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{meta.title(item)}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.version}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(item.timestamp)}</span>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
