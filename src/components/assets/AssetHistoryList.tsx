import type { ComponentType } from "react";
import {
  Upload,
  Pencil,
  MessageSquare,
  Check,
  X,
  Undo2,
  Tags,
  Eye,
  Download,
  UserPlus,
  Sparkles,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/utils/formatters";
import type { AuditLogApiDto } from "@/types";

interface EventMeta {
  label: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
  badgeClassName: string;
}

const EVENT_META: Record<string, EventMeta> = {
  IMAGE_UPLOAD: { label: "Uploaded", icon: Upload, iconClassName: "text-info", badgeClassName: "border-info/40 bg-background" },
  IMAGE_EDITED: { label: "Edited", icon: Pencil, iconClassName: "text-violet-400", badgeClassName: "border-violet-400/40 bg-background" },
  IMAGE_VERSION_FROM_ANNOTATION: { label: "New version from markup", icon: Pencil, iconClassName: "text-violet-400", badgeClassName: "border-violet-400/40 bg-background" },
  COMMENT_ADDED: { label: "Commented", icon: MessageSquare, iconClassName: "text-slate-300", badgeClassName: "border-slate-400/40 bg-background" },
  ASSET_APPROVED: { label: "Approved", icon: Check, iconClassName: "text-white", badgeClassName: "border-success bg-success" },
  ASSET_REJECTED: { label: "Rejected", icon: X, iconClassName: "text-white", badgeClassName: "border-danger bg-danger" },
  ASSET_APPROVAL_REVOKED: { label: "Approval revoked", icon: Undo2, iconClassName: "text-amber-400", badgeClassName: "border-amber-400/40 bg-background" },
  IMAGE_TAGGING: { label: "AI tagged", icon: Sparkles, iconClassName: "text-cyan-400", badgeClassName: "border-cyan-400/40 bg-background" },
  TAG_EDIT: { label: "Tag edited", icon: Tags, iconClassName: "text-cyan-400", badgeClassName: "border-cyan-400/40 bg-background" },
  SEO_EDIT: { label: "SEO updated", icon: Pencil, iconClassName: "text-violet-400", badgeClassName: "border-violet-400/40 bg-background" },
  ASSET_ASSIGNED: { label: "Assigned", icon: UserPlus, iconClassName: "text-primary", badgeClassName: "border-primary/40 bg-background" },
  ASSIGN_TO_MYSELF: { label: "Assigned to self", icon: UserPlus, iconClassName: "text-primary", badgeClassName: "border-primary/40 bg-background" },
  ASSET_VIEW: { label: "Viewed", icon: Eye, iconClassName: "text-muted-foreground", badgeClassName: "border-border bg-background" },
  ASSET_DOWNLOAD: { label: "Downloaded", icon: Download, iconClassName: "text-pink-400", badgeClassName: "border-pink-400/40 bg-background" },
};

function metaFor(eventType: string): EventMeta {
  return (
    EVENT_META[eventType] ?? {
      label: eventType.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()),
      icon: Clock,
      iconClassName: "text-muted-foreground",
      badgeClassName: "border-border bg-background",
    }
  );
}

// The requested History fields are upload/edit/comment/approve/reject — passive "someone viewed
// this" / "someone downloaded this" events are logged for other features (Recent, Transfers) but
// weren't asked for here and are mostly noise (e.g. every reviewer opening an asset logs a view),
// so they're filtered out rather than passed through just because the audit log happens to have them.
const EXCLUDED_EVENT_TYPES = new Set(["ASSET_VIEW", "ASSET_DOWNLOAD"]);

/** Real per-asset/batch/project History — who did what and when, sourced from the backend audit
 *  log (see useHistory), as opposed to RightPanel's previous placeholder which always rendered
 *  the unscoped global dashboard feed. */
export function AssetHistoryList({ entries, loading }: { entries: AuditLogApiDto[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  const visibleEntries = entries.filter((e) => !EXCLUDED_EVENT_TYPES.has(e.eventType));

  if (visibleEntries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-xs text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="relative">
        <div className="absolute bottom-0 left-2.5 top-0 w-px bg-border" />
        <div className="flex flex-col gap-2.5">
          {visibleEntries.map((entry) => {
            const meta = metaFor(entry.eventType);
            const Icon = meta.icon;
            return (
              <div key={entry.id} className="flex gap-2.5">
                <div className={`z-10 flex size-5 shrink-0 items-center justify-center rounded-full border ${meta.badgeClassName}`}>
                  <Icon className={`size-2.5 ${meta.iconClassName}`} />
                </div>
                <div className="flex-1 pb-0.5">
                  <p className="text-xs">
                    <span className="font-medium">{entry.actorName ?? "Someone"}</span>{" "}
                    <span className="text-muted-foreground">{meta.label}</span>
                    {entry.assetFileName && <span className="text-muted-foreground"> · {entry.assetFileName}</span>}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {entry.assetVersion != null && (
                      <span className="font-mono text-[10px] text-muted-foreground">v{entry.assetVersion}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{formatRelativeTime(entry.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
