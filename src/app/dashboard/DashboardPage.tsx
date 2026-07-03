import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { StatisticsSection } from "@/components/dashboard/StatisticsSection";
import { WorkListSection } from "@/components/dashboard/WorkListSection";
import { CloudStorageSection } from "@/components/dashboard/CloudStorageSection";
import { BackgroundServicesSection } from "@/components/dashboard/BackgroundServicesSection";
import { ErrorState } from "@/components/common/ErrorState";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardPage() {
  const { snapshot, status, error } = useDashboard();

  if (status === "error") {
    return (
      <DashboardLayout>
        <ErrorState message={error ?? "Something went wrong."} onRetry={() => window.location.reload()} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3">
        <WelcomeHeader pendingReviewCount={snapshot?.pendingReviewCount} />

        <StatisticsSection stats={snapshot?.stats ?? null} />

        <div className="grid h-68 grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="min-h-0 lg:col-span-2">
            <WorkListSection items={snapshot?.workItems ?? null} />
          </div>
          <div className="min-h-0">
            <CloudStorageSection storage={snapshot?.storage ?? null} />
          </div>
        </div>

        <BackgroundServicesSection summary={snapshot?.backgroundServices ?? null} />
      </div>
    </DashboardLayout>
  );
}
