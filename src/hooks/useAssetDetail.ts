import { useEffect, useState } from "react";
import { assetService } from "@/services/asset.service";
import type { AssetDetail, LoadingState } from "@/types";

export function useAssetDetail(assetId: string | null) {
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [status, setStatus] = useState<LoadingState>("idle");

  useEffect(() => {
    if (!assetId) {
      setDetail(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    assetService.getAssetDetail(assetId).then((data) => {
      if (cancelled) return;
      setDetail(data);
      setStatus("success");
    });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return { detail, status };
}
