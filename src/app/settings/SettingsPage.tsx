import { Settings } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Settings className="size-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Workspace settings are coming soon.
        </p>
      </div>
    </DashboardLayout>
  );
}
