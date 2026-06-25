import { AssetsToolbar } from "@/components/assets/AssetsToolbar";
import { AssetsTable } from "@/components/assets/AssetsTable";
import { AssetsGrid } from "@/components/assets/AssetsGrid";
import { ProjectFolderTable } from "@/components/assets/ProjectFolderTable";
import { ErrorState } from "@/components/common/ErrorState";
import { useProjectView } from "@/hooks/useProjectView";
import { useAssetStore } from "@/store";

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
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        ) : (
          <ProjectFolderTable folders={folderSummary} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <AssetsToolbar breadcrumbs={breadcrumbs} count={assets.length} countLabel={node.name} projectId={node.id} />
      {status === "loading" && assets.length === 0 ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      ) : viewMode === "grid" ? (
        <AssetsGrid assets={assets} />
      ) : (
        <AssetsTable assets={assets} />
      )}
    </div>
  );
}
