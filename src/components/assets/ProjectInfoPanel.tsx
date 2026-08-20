import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Download, FolderKanban, Check, X, Clock3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderDownloadDialog } from "@/components/assets/FolderDownloadDialog";
import { assetService } from "@/services/asset.service";
import { parseBackendTimestamp } from "@/utils/formatters";
import { flattenBatchOptions } from "@/utils/assetPath";
import { ROUTES } from "@/constants/routes";
import { useAssetStore } from "@/store";
import type { Asset, ProjectApiDto, ProjectNode } from "@/types";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const date = parseBackendTimestamp(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function findNode(nodes: ProjectNode[], id: string): ProjectNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Right-panel "Info" view for a single top-level project row single-clicked (not entered) —
 *  the project-level counterpart to BatchInfoPanel. Reuses getAllAssetsInFolders (already walks
 *  every nested batch under a tree node) for the asset totals/status counts, since the project
 *  entity itself (ProjectApiDto) carries only name/owner/created — no aggregate stats. */
export function ProjectInfoPanel({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const projectTree = useAssetStore((s) => s.projectTree);
  const expandAncestors = useAssetStore((s) => s.expandAncestors);
  const [project, setProject] = useState<ProjectApiDto | null>(null);
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProject(null);
    setAssets(null);
    assetService.getProject(projectId).then((data) => {
      if (!cancelled) setProject(data);
    });
    assetService.getAllAssetsInFolders([projectId], projectTree).then((data) => {
      if (!cancelled) setAssets(data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function handleOpen() {
    expandAncestors([projectId]);
    navigate(`${ROUTES.projects}/${projectId}`);
  }

  if (!project || !assets) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-8 w-2/3 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
    );
  }

  const node = findNode(projectTree, projectId);
  const totalBatches = node ? flattenBatchOptions(node.children ?? []).length : 0;
  const approved = assets.filter((a) => a.status === "approved" || a.status === "live").length;
  const rejected = assets.filter((a) => a.status === "rejected").length;
  const pending = assets.length - approved - rejected;
  const completion = assets.length > 0 ? Math.round((approved / assets.length) * 100) : 0;
  const lastActive = assets.reduce<string | null>((latest, a) => {
    if (!a.updatedAt) return latest;
    return !latest || a.updatedAt > latest ? a.updatedAt : latest;
  }, null);

  const infoRows = [
    { label: "Date Created", value: formatDate(project.createdAt) },
    { label: "Last Active", value: formatDate(lastActive) },
    { label: "Owner", value: project.ownerName ?? project.ownerEmail ?? "—" },
  ];
  const detailRows = [
    { label: "Total Batches", value: String(totalBatches) },
    { label: "Total Assets", value: String(assets.length) },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <div className="flex h-20 w-full items-center justify-center rounded-lg border border-border bg-background">
            <FolderKanban className="size-8 text-primary" />
          </div>

          <p className="truncate text-sm font-semibold">{project.name}</p>

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
            {infoRows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-2">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{row.label}</span>
                <span title={row.value} className="truncate text-right font-mono text-xs leading-relaxed text-foreground/70">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 border-t border-border pt-3">
            {detailRows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-2">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{row.label}</span>
                <span className="truncate text-right font-mono text-xs leading-relaxed text-foreground/70">{row.value}</span>
              </div>
            ))}
            <div className="flex items-start justify-between gap-2">
              <span className="w-24 shrink-0 text-xs text-muted-foreground">Completion</span>
              <span className="truncate text-right font-mono text-xs leading-relaxed text-foreground/70">{completion}%</span>
            </div>
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
              disabled={assets.length === 0}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white/5 px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="size-3" /> Download
            </button>
          </div>
        </div>
      </div>

      <FolderDownloadDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        folderIds={[projectId]}
        folderLabel={project.name}
      />
    </div>
  );
}
