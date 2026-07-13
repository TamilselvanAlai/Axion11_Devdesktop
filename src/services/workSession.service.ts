import { apiClient } from "@/services/api.service";

export interface WorkSessionSummary {
  activeSecondsToday: number;
  assetsEditedToday: number;
  activeSecondsYesterday: number;
  assetsEditedYesterday: number;
}

/** Tracks real login-to-logout working time and asset-edit activity, backing the dashboard's
 *  "Active Editing Time" / "Assets Edited Today" cards. See useWorkSessionTracking for the
 *  client-side lifecycle (start on login, heartbeat while open, record-edit on local sync, end
 *  on logout/close). */
export const workSessionService = {
  async start(): Promise<void> {
    await apiClient.post("/work-sessions/start");
  },

  async end(): Promise<void> {
    await apiClient.post("/work-sessions/end");
  },

  async heartbeat(): Promise<void> {
    await apiClient.post("/work-sessions/heartbeat");
  },

  async recordEdit(): Promise<void> {
    await apiClient.post("/work-sessions/record-edit");
  },

  async getTodaySummary(): Promise<WorkSessionSummary> {
    const { data } = await apiClient.get<WorkSessionSummary>("/work-sessions/summary/today");
    return data;
  },
};
