import type { PropsWithChildren } from "react";
import { AppProviders } from "@/providers/AppProviders";

export function RootLayout({ children }: PropsWithChildren) {
  return <AppProviders>{children}</AppProviders>;
}
