import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RightPanel } from "@/components/shared/RightPanel";
import { AssetsScopeView } from "@/components/assets/AssetsScopeView";

export default function RecentPage() {
  return (
    <DashboardLayout rightPanel={<RightPanel />}>
      <AssetsScopeView scope="recent" breadcrumbs={["Recent"]} countLabel="Hero Shots" />
    </DashboardLayout>
  );
}
