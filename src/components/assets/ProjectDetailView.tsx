import { AssetsToolbar } from "@/components/assets/AssetsToolbar";
import { AssetsTable } from "@/components/assets/AssetsTable";
import { AssetsGrid } from "@/components/assets/AssetsGrid";
import { ProjectFolderTable } from "@/components/assets/ProjectFolderTable";
import { AssetsSkeleton } from "@/components/assets/AssetsSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectView } from "@/hooks/useProjectView";
import { useAssetStore } from "@/store";

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

  if (!node) {
    return <ErrorState message="Project not found." />;
  }

  const breadcrumbs = ["Projects", node.name];

  if (isFolder) {
    return (
      <div className="flex flex-col gap-2">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <AssetsToolbar breadcrumbs={breadcrumbs} count={assets.length} countLabel={node.name} projectId={node.id} assets={assets} />
      {status === "loading" && assets.length === 0 ? (
        <AssetsSkeleton viewMode={viewMode} />
      ) : viewMode === "grid" ? (
        <AssetsGrid assets={assets} />
      ) : (
        <AssetsTable assets={assets} />
      )}
    </div>
  );
}
