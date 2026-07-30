import { useEffect } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { AssetsToolbar } from "@/components/assets/AssetsToolbar";
import { AssetsTable } from "@/components/assets/AssetsTable";
import { AssetsGrid } from "@/components/assets/AssetsGrid";
import { ProjectFolderTable } from "@/components/assets/ProjectFolderTable";
import { AssetsSkeleton } from "@/components/assets/AssetsSkeleton";
import { BulkActionBar } from "@/components/assets/BulkActionBar";
import { ErrorState } from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectView } from "@/hooks/useProjectView";
import { useFolderDropTarget } from "@/hooks/useFolderDropTarget";
import { localSyncService } from "@/services/localSync.service";
import { useAssetStore, useMountSettingsStore } from "@/store";
import { buildAssetRelativePath, findAncestorPath } from "@/utils/assetPath";
import { toUploadTarget } from "@/utils/dragDropFiles";

function FolderTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const { node, isFolder, assets, folderSummary, status, resolving } = useProjectView(projectId);
  const viewMode = useAssetStore((state) => state.viewMode);
  const projectTree = useAssetStore((state) => state.projectTree);
  const uploading = useAssetStore((state) => (node ? state.uploadingBatches[node.id] : undefined));
  // Shown through both the "uploading" and "processing" phases — the batch only clears from
  // uploadingBatches once its status stream reports COMPLETED/FAILED (see useFileUpload), at
  // which point the real rows have just been (re)fetched, so placeholder and real card never
  // need to coexist for the same file. The name filter below is a safety net for the rare case
  // where a real row for one of these names already landed from an unrelated refresh.
  const uploadingFileNames = uploading
    ? uploading.fileNames.filter((name) => !assets.some((a) => a.name === name))
    : [];
  const { isDragOver, dropHandlers } = useFolderDropTarget(node ? toUploadTarget(node) : null);
  const mountPoint = useMountSettingsStore((state) => state.mountPoint);
  const bumpLocalSyncTick = useAssetStore((state) => state.bumpLocalSyncTick);

  // Picks up files that are already sitting in the mount folder but weren't put there through
  // this app's own download flow (copied in manually, or downloaded before this device started
  // tracking its own syncs) — without this, the sync icon would only ever recognize a file after
  // the app itself re-downloads/reopens it. Runs once whenever this folder's asset list loads;
  // reconcileLocalAssets is a no-op for assets already known, so re-running on a refetch is cheap.
  useEffect(() => {
    if (isFolder || !node || assets.length === 0 || !localSyncService.isTauri()) return;
    let cancelled = false;
    const relativePaths = assets
      .filter((a) => a.batchId)
      .map((a) => buildAssetRelativePath(projectTree, a.batchId!, a.name, a.id));
    localSyncService.reconcileLocalAssets({ relativePaths, mountRoot: mountPoint }).then((adopted) => {
      if (!cancelled && adopted > 0) bumpLocalSyncTick();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFolder, node?.id, assets, projectTree, mountPoint]);

  if (!node) {
    // The tree can briefly lag behind reality (e.g. right after this batch was just created) —
    // show a loading state instead of a hard error while useProjectView retries.
    return resolving ? <FolderTableSkeleton /> : <ErrorState message="Project not found." />;
  }

  const breadcrumbs = findAncestorPath(projectTree, projectId) ?? [node.name];

  return (
    <div className="relative flex flex-1 flex-col gap-2" {...dropHandlers}>
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-primary/10">
          <UploadCloud className="size-8 text-primary" />
          <p className="text-sm font-medium text-primary">Drop to upload to {node.name}</p>
        </div>
      )}
      {isFolder ? (
        <>
          <AssetsToolbar
            breadcrumbs={breadcrumbs}
            count={folderSummary.reduce((sum, f) => sum + f.assetCount, 0)}
            countLabel={node.name}
          />
          {status === "loading" && folderSummary.length === 0 ? (
            <FolderTableSkeleton />
          ) : (
            <ProjectFolderTable folders={folderSummary} />
          )}
        </>
      ) : (
        <>
          <AssetsToolbar
            breadcrumbs={breadcrumbs}
            count={assets.length}
            countLabel={node.name}
            projectId={node.id}
            parentProjectId={node.projectId}
            assets={assets}
          />
          {uploading && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
              <Loader2 className="size-3.5 shrink-0 animate-spin" />
              {uploading.phase === "uploading"
                ? `Uploading ${uploading.total} file${uploading.total === 1 ? "" : "s"}…`
                : `Processing ${uploading.total} file${uploading.total === 1 ? "" : "s"}…`}
            </div>
          )}
          {status === "loading" && assets.length === 0 ? (
            <AssetsSkeleton viewMode={viewMode} />
          ) : viewMode === "grid" ? (
            <AssetsGrid assets={assets} uploadingFiles={uploadingFileNames} uploadingPhase={uploading?.phase} />
          ) : (
            <AssetsTable assets={assets} uploadingFiles={uploadingFileNames} uploadingPhase={uploading?.phase} />
          )}
          <BulkActionBar />
        </>
      )}
    </div>
  );
}
