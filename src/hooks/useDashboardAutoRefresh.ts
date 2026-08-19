import { useEffect } from "react";
import { dashboardService } from "@/services/dashboard.service";
import { useDashboardStore } from "@/store";

const REFRESH_INTERVAL_MS = 60_000;

/** Keeps the dashboard stat cards live, mounted once app-wide (see AppProviders) so the
 *  components that read the dashboard store (DashboardPage, RightPanel) share a single poller
 *  instead of each firing their own. NotificationsMenu has its own separate poller
 *  (useNotifications) since its feed is scoped to the current user, not team-wide activity.
 *  Refetches in place (no loading-skeleton flash), skips while the window isn't visible,
 *  and swallows errors so a transient network blip doesn't wipe out on-screen values. */
export function useDashboardAutoRefresh() {
  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      const { snapshot, setSnapshot } = useDashboardStore.getState();
      if (!snapshot || document.visibilityState !== "visible") return;
      dashboardService
        .getSnapshot()
        .then((data) => {
          if (!cancelled) setSnapshot(data);
        })
        .catch(() => undefined);
    };

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
}
