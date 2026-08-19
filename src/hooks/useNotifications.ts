import { useEffect, useState } from "react";
import { notificationsService } from "@/services/notifications.service";
import type { NotificationItem } from "@/types";

const REFRESH_INTERVAL_MS = 60_000;

/** Polls the personal notification feed (comments on assets assigned to you, assets assigned to
 *  you) for the topbar bell — separate from the dashboard's team-wide activity poller
 *  (useDashboardAutoRefresh) since this is scoped to the current user only. */
export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      notificationsService
        .getNotifications()
        .then((data) => {
          if (!cancelled) setItems(data);
        })
        .catch(() => undefined);
    };

    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return items;
}
