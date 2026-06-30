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
      <div className="flex flex-col gap-6">
        <WelcomeHeader />

        <StatisticsSection stats={snapshot?.stats ?? null} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <WorkListSection items={snapshot?.workItems ?? null} />
          </div>
          <CloudStorageSection storage={snapshot?.storage ?? null} />
        </div>

        <BackgroundServicesSection summary={snapshot?.backgroundServices ?? null} />
      </div>
    </DashboardLayout>
  );
}
