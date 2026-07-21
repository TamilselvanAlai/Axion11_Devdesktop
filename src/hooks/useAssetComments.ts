import { useEffect, useState } from "react";
import { assetService } from "@/services/asset.service";
import type { AssetComment, LoadingState } from "@/types";

export function useAssetComments(assetId: string | null) {
  const [comments, setComments] = useState<AssetComment[]>([]);
  const [status, setStatus] = useState<LoadingState>("idle");

  useEffect(() => {
    if (!assetId) {
      setComments([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    assetService.getComments(assetId).then((data) => {
      if (cancelled) return;
      setComments(data);
      setStatus("success");
    });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  async function addComment(message: string, annotation?: { image: string; x: number; y: number }) {
    if (!assetId || !message.trim()) return;
    const refreshed = await assetService.addComment(assetId, message.trim(), annotation);
    setComments(refreshed);
  }

  return { comments, status, addComment };
}
