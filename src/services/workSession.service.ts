import { apiClient } from "@/services/api.service";

export interface WorkSessionSummary {
  activeSecondsToday: number;
  assetsEditedToday: number;
  activeSecondsYesterday: number;
  assetsEditedYesterday: number;
  /** Lifetime active-editing total across every session ever recorded for this user. */
  activeSecondsAllTime: number;
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

  /** `idle` — whether the client's system-wide idle clock had already crossed the 10-minute
   *  threshold at tick time. `elapsedSeconds` — time since the previous tick; the server clamps
   *  this, so a delayed tick (e.g. after the machine wakes from sleep) can't over-credit time. */
  async heartbeat(params: { idle: boolean; elapsedSeconds: number }): Promise<void> {
    await apiClient.post("/work-sessions/heartbeat", params);
  },

  async recordEdit(): Promise<void> {
    await apiClient.post("/work-sessions/record-edit");
  },

  async getTodaySummary(): Promise<WorkSessionSummary> {
    const { data } = await apiClient.get<WorkSessionSummary>("/work-sessions/summary/today");
    return data;
  },
};
