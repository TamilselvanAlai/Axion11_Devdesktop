import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { NetworkStatusAlert } from "@/components/shared/NetworkStatusAlert";
import { useWorkSessionTracking } from "@/hooks/useWorkSessionTracking";
import { useDashboardAutoRefresh } from "@/hooks/useDashboardAutoRefresh";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function WorkSessionTracker() {
  useWorkSessionTracking();
  useDashboardAutoRefresh();
  return null;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <QueryClientProvider client={queryClient}>
        <WorkSessionTracker />
        <NetworkStatusAlert />
        {children}
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
