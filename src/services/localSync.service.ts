import { env } from "@/config/env";
import { useAuthStore } from "@/store";

export interface AssetSyncCompletePayload {
  assetId: string;
  batchId: string;
  localPath: string;
}

export interface AssetSyncErrorPayload {
  assetId: string;
  error: string;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export const localSyncService = {
  isTauri,

  /** Downloads the asset locally (mirroring the project tree), opens it, and watches it —
   *  any save is automatically re-uploaded as a new version of the same asset. */
  async openAndSync(params: { downloadUrl: string; relativePath: string; assetId: string; batchId: string }): Promise<string> {
    if (!isTauri()) {
      throw new Error("Opening and syncing files locally requires the desktop app.");
    }
    const { invoke } = await import("@tauri-apps/api/core");
    const token = useAuthStore.getState().token ?? "";
    return invoke<string>("open_and_sync_asset", {
      downloadUrl: params.downloadUrl,
      relativePath: params.relativePath,
      assetId: params.assetId,
      batchId: params.batchId,
      uploadUrl: `${env.apiBaseUrl}/batches/upload/{batchId}`,
      authToken: token,
    });
  },

  async onSyncComplete(cb: (payload: AssetSyncCompletePayload) => void): Promise<() => void> {
    if (!isTauri()) return () => undefined;
    const { listen } = await import("@tauri-apps/api/event");
    return listen<AssetSyncCompletePayload>("asset-sync-complete", (e) => cb(e.payload));
  },

  async onSyncError(cb: (payload: AssetSyncErrorPayload) => void): Promise<() => void> {
    if (!isTauri()) return () => undefined;
    const { listen } = await import("@tauri-apps/api/event");
    return listen<AssetSyncErrorPayload>("asset-sync-error", (e) => cb(e.payload));
  },
};
