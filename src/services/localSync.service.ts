import { env } from "@/config/env";
import { useAuthStore } from "@/store";

export interface AssetSyncCompletePayload {
  assetId: string;
  batchId: string;
  localPath: string;
  /** The freshly created version's asset id — a save always lands on a brand-new row, so
   *  consumers that want to show the new version (rather than just knowing a save happened)
   *  need to switch to this id. */
  newAssetId: string;
}

export interface OpenAssetResult {
  localPath: string;
  /** Epoch-millis timestamp of when this asset was first opened locally — stable across
   *  repeat opens, so it can be used to compute how long someone has spent on it. */
  openedAt: number;
}

export interface AssetSyncErrorPayload {
  assetId: string;
  error: string;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Opens a URL in the system's default browser. A plain `window.open()` inside the desktop
 *  app's Tauri WebView2 window doesn't reliably hand off to the OS browser — it can silently
 *  no-op — so this uses the opener plugin there, falling back to `window.open` on the web build. */
async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank");
}

/** Saves a file into the same `<mountRoot>\AxionDam\...` tree that mirrors the app's
 *  project/batch structure (see openAndSync) — the actual "save this file" action, as opposed to
 *  openExternalUrl, which just hands the URL to the OS/browser to do whatever it wants with
 *  (unreliable for formats like TIFF that have no good default handler, and even when "it works"
 *  the browser controls where the bytes land, not the app). Falls back to openExternalUrl on the
 *  web build, where there's no direct filesystem access to write to.
 *  Returns the saved path (Tauri) or "" (web, since the browser owns that decision there). */
async function downloadToMount(url: string, relativePath: string, mountRoot?: string | null): Promise<string> {
  if (!isTauri()) {
    await openExternalUrl(url);
    return "";
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("download_asset_to_mount", { url, relativePath, mountRoot: mountRoot ?? null });
}

/** Reveals a downloaded file in the OS file explorer (Windows Explorer, Finder, etc.) — the
 *  "Show in folder" action from a download's success toast. No-ops on the web build, where the
 *  app has no filesystem access to reveal anything. */
async function revealInFileManager(path: string): Promise<void> {
  if (!isTauri() || !path) return;
  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
  await revealItemInDir(path);
}

export const localSyncService = {
  isTauri,
  revealInFileManager,
  openExternalUrl,
  downloadToMount,

  /** Downloads the asset locally (mirroring the project tree), opens it, and watches it —
   *  any save is automatically re-uploaded as a new version of the same asset.
   *  `mountRoot`, when set (from Mount Settings), stores it under `<mountRoot>\AxionDam\...`
   *  instead of the app's default data directory. */
  async openAndSync(params: {
    downloadUrl: string;
    relativePath: string;
    assetId: string;
    batchId: string;
    mountRoot?: string | null;
  }): Promise<OpenAssetResult> {
    if (!isTauri()) {
      throw new Error("Opening and syncing files locally requires the desktop app.");
    }
    const { invoke } = await import("@tauri-apps/api/core");
    const token = useAuthStore.getState().token ?? "";
    return invoke<OpenAssetResult>("open_and_sync_asset", {
      downloadUrl: params.downloadUrl,
      relativePath: params.relativePath,
      assetId: params.assetId,
      batchId: params.batchId,
      apiBase: env.apiBaseUrl,
      authToken: token,
      mountRoot: params.mountRoot ?? null,
    });
  },

  /** Looks up an already-downloaded asset without downloading or opening it, so the UI can show
   *  "time spent" even when this session isn't what triggered the download. */
  async getLocalAssetInfo(params: { relativePath: string; mountRoot?: string | null }): Promise<OpenAssetResult | null> {
    if (!isTauri()) return null;
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<OpenAssetResult | null>("get_local_asset_info", {
      relativePath: params.relativePath,
      mountRoot: params.mountRoot ?? null,
    });
  },

  /** Checks a folder's worth of assets against this device's real disk in one call, adopting any
   *  that genuinely exist into this device's synced-assets manifest — for files that ended up in
   *  the mount folder some other way (copied in manually, downloaded before this device started
   *  tracking its own syncs) rather than through this app's own download flow. Returns how many
   *  were newly adopted, so the caller can skip refreshing icons when nothing changed. */
  async reconcileLocalAssets(params: { relativePaths: string[]; mountRoot?: string | null }): Promise<number> {
    if (!isTauri() || params.relativePaths.length === 0) return 0;
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<number>("reconcile_local_assets", {
      relativePaths: params.relativePaths,
      mountRoot: params.mountRoot ?? null,
    });
  },

  /** Confirms a drive/folder is actually writable before Mount Settings persists it. */
  async verifyMountRoot(root: string): Promise<void> {
    if (!isTauri()) {
      throw new Error("Verifying a local drive requires the desktop app.");
    }
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("verify_mount_root", { root });
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
