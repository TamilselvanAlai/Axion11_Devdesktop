import { useEffect, useState } from "react";
import { systemInfoService, type LocalDrive } from "@/services/systemInfo.service";

export function useLocalDrives() {
  const [drives, setDrives] = useState<LocalDrive[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!systemInfoService.isTauri()) {
      setError("Real drive info requires the desktop app.");
      return;
    }
    let cancelled = false;
    systemInfoService
      .listLocalDrives()
      .then((data) => {
        if (!cancelled) setDrives(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to read local drives.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { drives, error, isTauri: systemInfoService.isTauri() };
}
