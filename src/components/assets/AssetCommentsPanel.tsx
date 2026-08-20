import { useState } from "react";
import { toast } from "sonner";
import { Send, PenTool, Reply as ReplyIcon, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAssetComments } from "@/hooks/useAssetComments";
import { formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import type { AssetComment } from "@/types";

interface AssetCommentsPanelProps {
  assetId: string;
  /** Reads the pen-tool markup currently drawn (if any), so it can be attached to the next comment. */
  getAnnotation?: () => { image: string; x: number; y: number } | null;
  /** Called right after a comment carrying an annotation is saved, so the drawing can be cleared. */
  onAnnotationSubmitted?: () => void;
  /** Called whenever the "marked area" overlay should change — null hides it. */
  onActiveAnnotationChange?: (url: string | null) => void;
}

export function AssetCommentsPanel({
  assetId,
  getAnnotation,
  onAnnotationSubmitted,
  onActiveAnnotationChange,
}: AssetCommentsPanelProps) {
  const { comments, status, addComment, editComment, deleteComment } = useAssetComments(assetId);
  const [draft, setDraft] = useState("");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit() {
    if (!draft.trim()) return;
    const annotation = getAnnotation?.() ?? undefined;
    setDraft("");
    await addComment(draft, annotation);
    if (annotation) onAnnotationSubmitted?.();
  }

  function handleCommentClick(comment: AssetComment) {
    if (!comment.annotationImageUrl) return;
    setActiveCommentId((prev) => {
      const next = prev === comment.id ? null : comment.id;
      onActiveAnnotationChange?.(next ? comment.annotationImageUrl : null);
      return next;
    });
  }

  function startReply(commentId: string) {
    setEditingId(null);
    setReplyingToId(commentId);
    setReplyDraft("");
  }

  // There's no threaded-reply concept on the backend — a reply is just a regular comment, same
  // as the web app's implementation (see FullScreenAssetViewer's handleAddComment: it posts to
  // the same /comments endpoint regardless of replyingTo, and the server's response is always a
  // flat list). Kept as a distinct "Reply" affordance in the UI since that's what was asked for
  // and what the web app shows, even though it doesn't nest server-side.
  async function submitReply() {
    if (!replyDraft.trim()) return;
    const text = replyDraft;
    setReplyDraft("");
    setReplyingToId(null);
    await addComment(text);
  }

  function startEdit(comment: AssetComment) {
    setReplyingToId(null);
    setEditingId(comment.id);
    setEditingDraft(comment.message);
  }

  async function submitEdit(commentId: string) {
    if (!editingDraft.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await editComment(commentId, editingDraft);
      setEditingId(null);
    } catch {
      toast.error("Failed to update comment.");
    }
  }

  async function confirmDelete() {
    if (!deletingId) return;
    const id = deletingId;
    setDeletingId(null);
    try {
      await deleteComment(id);
    } catch {
      toast.error("Failed to delete comment.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {status === "loading" ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
                {comment.author.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.author.name}</span>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
                </div>

                {editingId === comment.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editingDraft}
                      onChange={(e) => setEditingDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitEdit(comment.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-white/20"
                    />
                    <button
                      type="button"
                      onClick={() => submitEdit(comment.id)}
                      className="shrink-0 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-accent"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p
                    onClick={() => handleCommentClick(comment)}
                    title={
                      comment.annotationImageUrl
                        ? activeCommentId === comment.id
                          ? "Click to hide marked area"
                          : "Click to view marked area"
                        : undefined
                    }
                    className={cn(
                      "text-xs leading-relaxed text-foreground/70",
                      comment.annotationImageUrl && "cursor-pointer transition-colors hover:text-foreground"
                    )}
                  >
                    {comment.annotationImageUrl && (
                      <PenTool
                        className={cn(
                          "mr-1 inline size-2.5",
                          activeCommentId === comment.id ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    )}
                    {comment.message}
                  </p>
                )}

                {editingId !== comment.id && (
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startReply(comment.id)}
                      className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                    >
                      <ReplyIcon className="size-2.5" /> Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(comment)}
                      className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-2.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(comment.id)}
                      className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="size-2.5" /> Delete
                    </button>
                  </div>
                )}

                {replyingToId === comment.id && (
                  <div className="mt-2 flex items-center gap-1.5 border-l-2 border-primary/40 pl-2">
                    <input
                      type="text"
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitReply()}
                      placeholder="Write a reply…"
                      autoFocus
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-white/20"
                    />
                    <button
                      type="button"
                      aria-label="Send reply"
                      onClick={submitReply}
                      disabled={!replyDraft.trim()}
                      className="shrink-0 text-primary transition-colors hover:text-accent disabled:opacity-50"
                    >
                      <Send className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 transition-colors focus-within:border-white/20">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Add comment…"
            className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            aria-label="Send comment"
            onClick={handleSubmit}
            disabled={!draft.trim()}
            className="text-primary transition-colors hover:text-accent disabled:opacity-50"
          >
            <Send className="size-3" />
          </button>
        </div>
      </div>

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
