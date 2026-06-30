import type { DashboardSnapshot } from "@/types";
import { apiClient } from "@/services/api.service";

export const dashboardService = {
  async getSnapshot(): Promise<DashboardSnapshot> {
    const { data } = await apiClient.get<DashboardSnapshot>("/dashboard/snapshot");
    return data;
  },
};
