import { Bell, MessageSquare, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationsStore } from "@/store/notificationsStore";
import { useAssetStore } from "@/store";
import { ROUTES } from "@/constants/routes";
import { findAncestorIds } from "@/utils/assetPath";
import { formatRelativeTime } from "@/utils/formatters";
import type { NotificationItem, NotificationType } from "@/types";

const NOTIFICATION_META: Record<NotificationType, { title: (item: NotificationItem) => string; icon: typeof MessageSquare; className: string }> = {
  commented: { title: (i) => `${i.actor} commented on ${i.fileName ?? "an asset"}`, icon: MessageSquare, className: "text-slate-300" },
  assigned: { title: (i) => `${i.actor} assigned ${i.fileName ?? "an asset"} to you`, icon: UserPlus, className: "text-violet-400" },
};

export function NotificationsMenu() {
  const navigate = useNavigate();
  const items = useNotifications();
  const { readIds, markAllRead } = useNotificationsStore();
  const projectTree = useAssetStore((s) => s.projectTree);
  const selectAsset = useAssetStore((s) => s.selectAsset);
  const expandAncestors = useAssetStore((s) => s.expandAncestors);
  const hasUnread = items.some((item) => !readIds.includes(item.id));

  function goToAsset(item: NotificationItem) {
    const target = item.batchId ?? item.projectId;
    if (!target || !item.assetId) return;
    const ancestorIds = findAncestorIds(projectTree, target);
    if (ancestorIds) expandAncestors(ancestorIds);
    navigate(`${ROUTES.projects}/${target}`);
    selectAsset(item.assetId);
  }

  return (
    <DropdownMenu onOpenChange={(open) => !open && markAllRead(items.map((i) => i.id))}>
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
              const unread = !readIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToAsset(item)}
                  className="flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-muted"
                >
                  <Icon className={`mt-0.5 size-4 shrink-0 ${meta.className}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{meta.title(item)}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.version}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(item.timestamp)}</span>
                    {unread && <span className="size-1.5 rounded-full bg-primary" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
