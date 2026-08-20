import { useEffect, useState } from "react";
import { assetService } from "@/services/asset.service";
import type { BatchWithUploadsApiDto, LoadingState } from "@/types";

export function useBatchDetail(batchNodeId: string | null) {
  const [detail, setDetail] = useState<BatchWithUploadsApiDto | null>(null);
  const [status, setStatus] = useState<LoadingState>("idle");

  useEffect(() => {
    if (!batchNodeId) {
      setDetail(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setDetail(null);

    assetService.getBatchDetail(batchNodeId).then((data) => {
      if (cancelled) return;
      setDetail(data);
      setStatus("success");
    });

    return () => {
      cancelled = true;
    };
  }, [batchNodeId]);

  return { detail, status };
}
