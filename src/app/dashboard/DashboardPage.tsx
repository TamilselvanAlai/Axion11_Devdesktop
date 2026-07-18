import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { StatisticsSection } from "@/components/dashboard/StatisticsSection";
import { WorkListSection } from "@/components/dashboard/WorkListSection";
import { CloudStorageSection } from "@/components/dashboard/CloudStorageSection";
import { BackgroundServicesSection } from "@/components/dashboard/BackgroundServicesSection";
import { AssetsEditedModal } from "@/components/dashboard/AssetsEditedModal";
import { ErrorState } from "@/components/common/ErrorState";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardPage() {
  const { snapshot, status, error } = useDashboard();
  const [assetsEditedOpen, setAssetsEditedOpen] = useState(false);

  if (status === "error") {
    return (
      <DashboardLayout hideSearch>
        <ErrorState message={error ?? "Something went wrong."} onRetry={() => window.location.reload()} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout hideSearch>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="shrink-0">
          <WelcomeHeader pendingReviewCount={snapshot?.pendingReviewCount} />
        </div>

        <div className="shrink-0">
          <StatisticsSection stats={snapshot?.stats ?? null} onAssetsEditedClick={() => setAssetsEditedOpen(true)} />
        </div>

        <div className="min-h-50 flex-1 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="min-h-0 lg:col-span-2">
            <WorkListSection items={snapshot?.workItems ?? null} />
          </div>
          <div className="min-h-0">
            <CloudStorageSection storage={snapshot?.storage ?? null} />
          </div>
        </div>

        <div className="shrink-0">
          <BackgroundServicesSection summary={snapshot?.backgroundServices ?? null} />
        </div>
      </div>

      <AssetsEditedModal open={assetsEditedOpen} onOpenChange={setAssetsEditedOpen} />
    </DashboardLayout>
  );
}
