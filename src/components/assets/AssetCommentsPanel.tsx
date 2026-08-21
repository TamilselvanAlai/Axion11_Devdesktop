import { useState } from "react";
import { toast } from "sonner";
import { Send, PenTool, Reply as ReplyIcon, Pencil, Trash2, Check, X } from "lucide-react";
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

interface CommentThread {
  root: AssetComment;
  replies: AssetComment[];
}

/** Groups the flat comment list into one thread per top-level comment (parentCommentId null),
 *  each carrying its own replies in order — this is what lets a comment and everything replying
 *  to it render as a single card instead of every reply reading as its own unrelated comment. */
function groupIntoThreads(comments: AssetComment[]): CommentThread[] {
  const roots = comments.filter((c) => !c.parentCommentId);
  const repliesByParent = new Map<string, AssetComment[]>();
  for (const c of comments) {
    if (!c.parentCommentId) continue;
    const list = repliesByParent.get(c.parentCommentId) ?? [];
    list.push(c);
    repliesByParent.set(c.parentCommentId, list);
  }
  return roots.map((root) => ({ root, replies: repliesByParent.get(root.id) ?? [] }));
}

export function AssetCommentsPanel({
  assetId,
  getAnnotation,
  onAnnotationSubmitted,
  onActiveAnnotationChange,
}: AssetCommentsPanelProps) {
  const { comments, status, addComment, editComment, deleteComment, toggleResolved } = useAssetComments(assetId);
  const [draft, setDraft] = useState("");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const threads = groupIntoThreads(comments);

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

  function startReply(rootId: string) {
    setEditingId(null);
    setReplyingToId(rootId);
    setReplyDraft("");
  }

  // Replies to threadRootId, not to whatever comment the Reply button was clicked on — a reply
  // is always a direct child of the thread's top-level comment (one level of nesting, matching
  // how it renders), so replying from within an already-open thread still attaches to the same
  // root rather than trying to build a deeper chain the UI doesn't display.
  async function submitReply(threadRootId: string) {
    if (!replyDraft.trim()) return;
    const text = replyDraft;
    setReplyDraft("");
    setReplyingToId(null);
    await addComment(text, undefined, threadRootId);
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

  async function handleToggleResolved(comment: AssetComment) {
    try {
      await toggleResolved(comment.id, !comment.resolved);
    } catch {
      toast.error("Failed to update comment.");
    }
  }

  function CommentRow({ comment }: { comment: AssetComment }) {
    return (
      <div className="flex gap-2.5">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
          {comment.author.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1">
            <span className="text-sm font-medium">{comment.author.name}</span>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
              {comment.resolved && (
                <span className="flex items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                  <Check className="size-2.5" /> Done
                </span>
              )}
            </div>
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
                aria-label="Save"
                title="Save"
                className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-accent"
              >
                <Check className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                aria-label="Cancel"
                title="Cancel"
                className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-white/10"
              >
                <X className="size-3" />
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
                comment.resolved && "line-through opacity-60",
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
              {!comment.parentCommentId && (
                <button
                  type="button"
                  onClick={() => startReply(comment.id)}
                  className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                >
                  <ReplyIcon className="size-2.5" /> Reply
                </button>
              )}
              <button
                type="button"
                onClick={() => handleToggleResolved(comment)}
                className={cn(
                  "flex items-center gap-1 text-[10px] font-medium",
                  comment.resolved ? "text-success" : "text-muted-foreground hover:text-success"
                )}
              >
                <Check className="size-2.5" /> {comment.resolved ? "Done" : "Mark done"}
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {status === "loading" ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)
        ) : threads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          threads.map(({ root, replies }) => (
            // Everything about this thread — the original comment, every reply to it, and the
            // reply composer — lives inside one bordered card, so a reply reads as part of the
            // comment it replied to instead of just another unrelated row in the list.
            <div key={root.id} className="rounded-lg border border-border bg-white/2 p-3">
              <CommentRow comment={root} />

              {replies.length > 0 && (
                <div className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-3">
                  {replies.map((reply) => (
                    <CommentRow key={reply.id} comment={reply} />
                  ))}
                </div>
              )}

              {replyingToId === root.id && (
                <div className="mt-2 flex items-center gap-1.5 border-l-2 border-primary/40 pl-3">
                  <input
                    type="text"
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitReply(root.id)}
                    placeholder="Write a reply…"
                    autoFocus
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-white/20"
                  />
                  <button
                    type="button"
                    aria-label="Send reply"
                    onClick={() => submitReply(root.id)}
                    disabled={!replyDraft.trim()}
                    className="shrink-0 text-primary transition-colors hover:text-accent disabled:opacity-50"
                  >
                    <Send className="size-3" />
                  </button>
                </div>
              )}
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
