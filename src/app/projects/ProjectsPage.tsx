import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RightPanel } from "@/components/shared/RightPanel";
import { ProjectFolderTable } from "@/components/assets/ProjectFolderTable";
import { Skeleton } from "@/components/ui/skeleton";
import { assetService } from "@/services/asset.service";
import { useAssetStore } from "@/store";
import type { ProjectSummary } from "@/types";

function FolderTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const setFolderSummary = useAssetStore((s) => s.setFolderSummary);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    assetService
      .getProjectsList()
      .then((data) => {
        if (cancelled) return;
        setProjects(data);
        // RightPanel cross-references the store's folderSummary to tell a checked/clicked
        // folder id apart from an asset id (see its singleSelectedIsFolder) — this list is kept
        // in local state above for the page's own render, but must also land in the store or a
        // checkbox/row selection here would show a blank info panel exactly like the in-project
        // batch list did before it synced the same way.
        setFolderSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load projects.");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return (
    <DashboardLayout rightPanel={<RightPanel />}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold">Projects</h1>
          {projects && <span className="text-xs text-muted-foreground">{projects.length} projects</span>}
        </div>
        {error ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm font-medium">Couldn't load projects</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => setReloadToken((t) => t + 1)}
              className="mt-1 text-xs font-medium text-primary underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : !projects ? (
          <FolderTableSkeleton />
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm font-medium">No projects yet</p>
          </div>
        ) : (
          <ProjectFolderTable folders={projects} />
        )}
      </div>
    </DashboardLayout>
  );
}
