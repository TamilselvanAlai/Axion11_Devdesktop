import { useState } from "react";
import { Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetComments } from "@/hooks/useAssetComments";
import { formatRelativeTime } from "@/utils/formatters";

export function AssetCommentsPanel({ assetId }: { assetId: string }) {
  const { comments, status, addComment } = useAssetComments(assetId);
  const [draft, setDraft] = useState("");

  function handleSubmit() {
    if (!draft.trim()) return;
    addComment(draft);
    setDraft("");
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
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.author.name}</span>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
                </div>
                <p className="text-xs leading-relaxed text-foreground/70">{comment.message}</p>
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
    </div>
  );
}
