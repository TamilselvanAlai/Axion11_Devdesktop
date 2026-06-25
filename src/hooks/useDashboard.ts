import { useEffect } from "react";
import { dashboardService } from "@/services/dashboard.service";
import { useDashboardStore } from "@/store";

export function useDashboard() {
  const { snapshot, status, error, setSnapshot, setStatus, setError } = useDashboardStore();

  useEffect(() => {
    if (snapshot) return;
    let cancelled = false;

    setStatus("loading");
    dashboardService
      .getSnapshot()
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [snapshot, setSnapshot, setStatus, setError]);

  return { snapshot, status, error };
}
