import { apiClient } from "@/services/api.service";

export interface AssetEditSessionEntry {
  assetId: number;
  fileName: string;
  thumbnailUrl: string | null;
  version: number | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
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

  async getToday(): Promise<AssetEditSessionEntry[]> {
    const { data } = await apiClient.get<AssetEditSessionEntry[]>("/asset-edit-sessions/today");
    return data;
  },
};
