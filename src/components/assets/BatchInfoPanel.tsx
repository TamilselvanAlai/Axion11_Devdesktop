import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, FolderOpen, Download, Check, X, Clock3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderDownloadDialog } from "@/components/assets/FolderDownloadDialog";
import { useBatchDetail } from "@/hooks/useBatchDetail";
import { parseBackendTimestamp } from "@/utils/formatters";
import { findAncestorIds } from "@/utils/assetPath";
import { ROUTES } from "@/constants/routes";
import { useAssetStore } from "@/store";

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const date = parseBackendTimestamp(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Right-panel "Info" view for a single folder/batch clicked once (not entered) — mirrors
 *  AssetInfoPanel for individual assets. Double-clicking the row (or clicking Open below)
 *  navigates into the batch, matching the web app's single-click-selects / double-click-opens
 *  convention (see ProjectFolderTable). */
export function BatchInfoPanel({ batchId }: { batchId: string }) {
  const navigate = useNavigate();
  const projectTree = useAssetStore((s) => s.projectTree);
  const expandAncestors = useAssetStore((s) => s.expandAncestors);
  const { detail, status } = useBatchDetail(batchId);
  const [downloadOpen, setDownloadOpen] = useState(false);

  function handleOpen() {
    expandAncestors(findAncestorIds(projectTree, batchId) ?? [batchId]);
    navigate(`${ROUTES.projects}/${batchId}`);
  }

  if (status === "loading" || !detail) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-8 w-2/3 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
    );
  }

  const uploads = detail.imageUploads ?? [];
  const approved = uploads.filter((u) => (u.approvalStatus ?? "").toLowerCase() === "approved").length;
  const rejected = uploads.filter((u) => (u.approvalStatus ?? "").toLowerCase() === "rejected").length;
  const pending = uploads.length - approved - rejected;

  const rows = [
    { label: "Project", value: detail.projectName ?? "—" },
    { label: "Status", value: detail.status ?? "—" },
    { label: "Total Assets", value: String(detail.totalImages ?? uploads.length) },
    { label: "Assigned", value: detail.assignedTo ?? "Unassigned" },
    { label: "Priority", value: detail.priority ?? "—" },
    { label: "Due Date", value: formatDateTime(detail.dueDate) },
    { label: "Created", value: formatDateTime(detail.createdAt) },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <div className="flex h-20 w-full items-center justify-center rounded-lg border border-border bg-background">
            <Folder className="size-8 text-emerald-500" />
          </div>

          <div>
            <p className="truncate text-sm font-semibold">{detail.name}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground">
              <Check className="size-2.5 text-success" /> {approved} approved
            </span>
            <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground">
              <Clock3 className="size-2.5 text-amber-500" /> {pending} pending
            </span>
            <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground">
              <X className="size-2.5 text-danger" /> {rejected} rejected
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-2">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{row.label}</span>
                <span title={row.value} className="truncate text-right font-mono text-xs leading-relaxed text-foreground/70">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleOpen}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-accent"
            >
              <FolderOpen className="size-3" /> Open
            </button>
            <button
              onClick={() => setDownloadOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white/5 px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-white/10"
            >
              <Download className="size-3" /> Download
            </button>
          </div>
        </div>
      </div>

      <FolderDownloadDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        folderIds={[batchId]}
        folderLabel={detail.name}
      />
    </div>
  );
}
