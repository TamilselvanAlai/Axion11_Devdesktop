import { UploadCloud } from "lucide-react";
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
  const { node, isFolder, assets, folderSummary, status } = useProjectView(projectId);
  const viewMode = useAssetStore((state) => state.viewMode);
  const projectTree = useAssetStore((state) => state.projectTree);
  const { isDragOver, dropHandlers } = useFolderDropTarget(node ? toUploadTarget(node) : null);

  if (!node) {
    return <ErrorState message="Project not found." />;
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
          {status === "loading" && assets.length === 0 ? (
            <AssetsSkeleton viewMode={viewMode} />
          ) : viewMode === "grid" ? (
            <AssetsGrid assets={assets} />
          ) : (
            <AssetsTable assets={assets} />
          )}
        </>
      )}
    </div>
  );
}
