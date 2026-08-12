import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RightPanel } from "@/components/shared/RightPanel";
import { AssetsScopeView } from "@/components/assets/AssetsScopeView";

export default function TransfersPage() {
  return (
    <DashboardLayout rightPanel={<RightPanel />}>
      <AssetsScopeView
        scope="transfers"
        breadcrumbs={["Transfers"]}
        countLabel="Hero Shots"
        subtitle="Assets you've uploaded or downloaded — not a team-wide feed."
      />
    </DashboardLayout>
  );
}
