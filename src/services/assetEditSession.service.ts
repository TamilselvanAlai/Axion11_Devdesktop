import { apiClient } from "@/services/api.service";

export interface AssetEditSessionEntry {
  assetId: number;
  fileName: string;
  thumbnailUrl: string | null;
  version: number | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  /** Wall-clock open-to-close span minus durationSeconds — how much of the session was excluded
   *  as idle (10+ min with no system input). */
  idleSecondsExcluded: number;
  endReason: "SAVED" | "SWITCHED" | "SESSION_END";
}

/** Tracks per-asset "actively editing" time, independent of local file/cache state — a session
 *  starts only on an explicit Open File/Retouch click, never on a background download, so
 *  prefetching never gets counted as edit time. Started in AssetInfoPanel; ended centrally in
 *  useWorkSessionTracking whenever any asset's local edit finishes re-syncing. */
export const assetEditSessionService = {
  async start(assetId: string): Promise<void> {
    await apiClient.post("/asset-edit-sessions/start", { assetId });
  },

  async end(assetId: string): Promise<void> {
    await apiClient.post("/asset-edit-sessions/end", { assetId });
  },

  /** Sibling to workSessionService.heartbeat, called on the same tick while this asset's edit
   *  session is open, so its idle-corrected time accumulates in step with overall active time. */
  async tick(assetId: string, params: { idle: boolean; elapsedSeconds: number }): Promise<void> {
    await apiClient.post("/asset-edit-sessions/tick", { assetId, ...params });
  },

  async getToday(): Promise<AssetEditSessionEntry[]> {
    const { data } = await apiClient.get<AssetEditSessionEntry[]>("/asset-edit-sessions/today");
    return data;
  },

  /** My own sessions (not every user's — see timeReportService for the admin-wide payroll
   *  version) in an inclusive date range — backs the dashboard's This Week/This Month tabs. */
  async getRange(from: string, to: string): Promise<AssetEditSessionEntry[]> {
    const { data } = await apiClient.get<AssetEditSessionEntry[]>("/asset-edit-sessions/range", {
      params: { from, to },
    });
    return data;
  },

  /** Total logged editing time for this asset across every user, in seconds — shown to all
   *  users as "Production Time" in the asset info panel. */
  async getAssetTotalSeconds(assetId: string): Promise<number> {
    const { data } = await apiClient.get<{ totalSeconds: number }>(
      `/asset-edit-sessions/asset/${encodeURIComponent(assetId)}/total`
    );
    return data.totalSeconds;
  },
};
