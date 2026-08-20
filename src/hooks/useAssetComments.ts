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

  /** Editing and deleting act on a single comment, so update just that entry locally rather
   *  than refetching/replacing the whole list (unlike addComment, whose endpoint already
   *  returns the full refreshed list). */
  async function editComment(commentId: string, message: string) {
    if (!message.trim()) return;
    await assetService.editComment(commentId, message.trim());
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, message: message.trim() } : c)));
  }

  async function deleteComment(commentId: string) {
    await assetService.deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return { comments, status, addComment, editComment, deleteComment };
}
