import { Loader2, UploadCloud } from "lucide-react";
import { AssetsToolbar } from "@/components/assets/AssetsToolbar";
import { AssetsTable } from "@/components/assets/AssetsTable";
import { AssetsGrid } from "@/components/assets/AssetsGrid";
import { ProjectFolderTable } from "@/components/assets/ProjectFolderTable";
import { AssetsSkeleton } from "@/components/assets/AssetsSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectView } from "@/hooks/useProjectView";
import { useFolderDropTarget } from "@/hooks/useFolderDropTarget";
import { useAssetStore } from "@/store";
import { findAncestorPath } from "@/utils/assetPath";
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
  // Only while the request is actually in flight — once we're "processing", the batch has
  // been accepted server-side and real rows will start replacing these via the next poll, so
  // placeholders and real rows would otherwise both show for the same files.
  const uploadingFileNames = uploading?.phase === "uploading" ? uploading.fileNames : [];
  const { isDragOver, dropHandlers } = useFolderDropTarget(node ? toUploadTarget(node) : null);

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
            <AssetsGrid assets={assets} uploadingFiles={uploadingFileNames} />
          ) : (
            <AssetsTable assets={assets} uploadingFiles={uploadingFileNames} />
          )}
        </>
      )}
    </div>
  );
}
