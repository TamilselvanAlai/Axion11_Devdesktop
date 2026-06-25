import { FolderKanban } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function AssetsPage() {
  return (
    <DashboardLayout>
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <FolderKanban className="size-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Projects</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Project and asset management is coming soon to this workspace.
        </p>
      </div>
    </DashboardLayout>
  );
}
