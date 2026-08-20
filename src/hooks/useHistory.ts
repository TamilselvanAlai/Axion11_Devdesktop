import { useEffect, useState } from "react";
import { assetService } from "@/services/asset.service";
import type { AuditLogApiDto, LoadingState } from "@/types";

export type HistoryScope = { type: "asset" | "batch" | "project"; id: string } | null;

export function useHistory(scope: HistoryScope) {
  const [entries, setEntries] = useState<AuditLogApiDto[]>([]);
  const [status, setStatus] = useState<LoadingState>("idle");

  useEffect(() => {
    if (!scope) {
      setEntries([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    const fetcher =
      scope.type === "asset"
        ? assetService.getAssetHistory(scope.id)
        : scope.type === "batch"
          ? assetService.getBatchHistory(scope.id)
          : assetService.getProjectHistory(scope.id);

    fetcher.then((data) => {
      if (cancelled) return;
      setEntries(data);
      setStatus("success");
    });

    return () => {
      cancelled = true;
    };
  }, [scope?.type, scope?.id]);

  return { entries, status };
}
