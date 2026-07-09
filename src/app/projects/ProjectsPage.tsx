import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RightPanel } from "@/components/shared/RightPanel";
import { ProjectFolderTable } from "@/components/assets/ProjectFolderTable";
import { Skeleton } from "@/components/ui/skeleton";
import { assetService } from "@/services/asset.service";
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

  useEffect(() => {
    let cancelled = false;
    assetService.getProjectsList().then((data) => {
      if (!cancelled) setProjects(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout rightPanel={<RightPanel />}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold">Projects</h1>
          <span className="text-xs text-muted-foreground">{projects?.length ?? 0} projects</span>
        </div>
        {!projects ? (
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
