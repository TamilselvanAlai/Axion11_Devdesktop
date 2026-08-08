import { apiClient } from "@/services/api.service";

export interface WorkSessionSummary {
  activeSecondsToday: number;
  assetsEditedToday: number;
  activeSecondsYesterday: number;
  assetsEditedYesterday: number;
  /** Lifetime idle-corrected active-editing total across every session ever recorded — "how long
   *  have I actually been working" (10-minute idle bar). */
  activeSecondsAllTime: number;
  /** Same idea, gated by a stricter 3-minute idle bar — "was I at my desk at all", so this can be
   *  less than activeSecondsToday for the same stretch (that's expected, not a bug). */
  timeInAppSecondsToday: number;
  timeInAppSecondsAllTime: number;
}

export interface WorkSessionRangeSummary {
  activeSeconds: number;
  timeInAppSeconds: number;
  assetsEditedCount: number;
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

  /** `idle`/`idleForApp` — whether the client's idle streak had already crossed the 10-minute
   *  (activeSeconds) / 3-minute (timeInAppSeconds) bar at tick time, both measured off the same
   *  underlying streak (see useWorkSessionTracking). `elapsedSeconds` — time since the previous
   *  tick; the server clamps this, so a delayed tick (e.g. after the machine wakes from sleep)
   *  can't over-credit time. */
  async heartbeat(params: { idle: boolean; idleForApp: boolean; elapsedSeconds: number }): Promise<void> {
    await apiClient.post("/work-sessions/heartbeat", params);
  },

  async recordEdit(): Promise<void> {
    await apiClient.post("/work-sessions/record-edit");
  },

  async getTodaySummary(): Promise<WorkSessionSummary> {
    const { data } = await apiClient.get<WorkSessionSummary>("/work-sessions/summary/today");
    return data;
  },

  /** My own Active Editing Time / Time In App for an arbitrary date range — backs the Time
   *  Management card's Week/Month tabs. */
  async getRangeSummary(from: string, to: string): Promise<WorkSessionRangeSummary> {
    const { data } = await apiClient.get<WorkSessionRangeSummary>("/work-sessions/summary/range", {
      params: { from, to },
    });
    return data;
  },
};
