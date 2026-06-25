import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RightPanel } from "@/components/shared/RightPanel";
import { AssetsScopeView } from "@/components/assets/AssetsScopeView";

export default function ProjectsPage() {
  return (
    <DashboardLayout rightPanel={<RightPanel />}>
      <AssetsScopeView scope="all" breadcrumbs={["Projects"]} countLabel="Hero Shots" />
    </DashboardLayout>
  );
}
