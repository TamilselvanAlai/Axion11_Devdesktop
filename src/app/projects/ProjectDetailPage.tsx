import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RightPanel } from "@/components/shared/RightPanel";
import { ProjectDetailView } from "@/components/assets/ProjectDetailView";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <DashboardLayout rightPanel={<RightPanel />}>
      {projectId ? <ProjectDetailView projectId={projectId} /> : null}
    </DashboardLayout>
  );
}
