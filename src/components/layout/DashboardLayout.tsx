import type { PropsWithChildren, ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

interface DashboardLayoutProps extends PropsWithChildren {
  rightPanel?: ReactNode;
}

export function DashboardLayout({ children, rightPanel }: DashboardLayoutProps) {
  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <main className="@container flex-1 overflow-y-auto p-2">{children}</main>
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
