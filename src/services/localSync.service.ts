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

/** Opens a folder itself in the OS file explorer — used for a batch download's destination
 *  folder (a directory the user just picked), as opposed to revealInFileManager, which selects
 *  a single file within its parent folder. */
async function openFolderInFileManager(path: string): Promise<void> {
  if (!isTauri() || !path) return;
  const { openPath } = await import("@tauri-apps/plugin-opener");
  await openPath(path);
}

/** Prompts the user to pick a folder via the native OS picker (Explorer/Finder) — used by batch
 *  downloads, which (unlike a single-file context-menu download) must ask where to save rather
 *  than silently defaulting to the Mount Settings folder. Returns null on the web build (no
 *  filesystem access to pick into) or if the user cancels the picker. */
async function pickFolder(title?: string): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const result = await open({ directory: true, multiple: false, title: title ?? "Choose a folder to save to" });
  return typeof result === "string" ? result : null;
}

const DOWNLOAD_ACTION_TYPE = "axion-download-complete";
const OPEN_FOLDER_ACTION_ID = "open-folder";
let notificationActionsReady: Promise<void> | null = null;

/** Registers the "Open Folder" action button once per app session and wires a single listener
 *  that reveals whichever path the clicked notification carries in `extra.revealPath` — every
 *  completed-download notification reuses this one action type/listener rather than each
 *  registering (and leaking) its own. Best-effort: action buttons on notifications are genuinely
 *  platform-dependent (reliable on Windows/macOS, daemon-dependent on Linux), so this never
 *  throws — a download's own success toast (with its own working reveal button) is still shown
 *  regardless of whether the OS notification's action fires. */
async function ensureNotificationActionsRegistered(): Promise<void> {
  if (!notificationActionsReady) {
    notificationActionsReady = (async () => {
      const { registerActionTypes, onAction } = await import("@tauri-apps/plugin-notification");
      await registerActionTypes([
        { id: DOWNLOAD_ACTION_TYPE, actions: [{ id: OPEN_FOLDER_ACTION_ID, title: "Open Folder" }] },
      ]);
      await onAction((notification) => {
        const actionId = (notification as { actionId?: string }).actionId;
        // "tauri" is the reserved actionId the plugin reports for a plain click on the
        // notification body (no action button pressed) — treated the same as the explicit
        // button so clicking the notification itself also opens the folder where supported.
        if (actionId !== OPEN_FOLDER_ACTION_ID && actionId !== "tauri") return;
        const revealPath = notification.extra?.revealPath;
        if (typeof revealPath === "string") openFolderInFileManager(revealPath);
      });
    })().catch(() => undefined);
  }
  return notificationActionsReady;
}

/** Sends an OS-level (system tray/notification-center) notification for a batch download's
 *  progress or completion — distinct from the in-app Sonner toast, which keeps working
 *  regardless of OS notification permission/support. `revealPath`, when given, attaches an
 *  "Open Folder" action to the notification (see ensureNotificationActionsRegistered). No-ops
 *  on the web build or if the user never grants OS notification permission. */
async function notifyDownload(title: string, body: string, revealPath?: string): Promise<void> {
  if (!isTauri()) return;
  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import("@tauri-apps/plugin-notification");
    let granted = await isPermissionGranted();
    if (!granted) granted = (await requestPermission()) === "granted";
    if (!granted) return;
    if (revealPath) await ensureNotificationActionsRegistered();
    sendNotification({
      title,
      body,
      ...(revealPath ? { actionTypeId: DOWNLOAD_ACTION_TYPE, extra: { revealPath } } : {}),
    });
  } catch {
    // OS notifications are a nice-to-have alongside the toast — never let a failure here
    // (permission plumbing, an unsupported platform) surface as a download error.
  }
}

/** Seconds since the last physical mouse/keyboard input, system-wide — not scoped to this app's
 *  own window, since the user's real activity typically happens inside a 3rd-party editor
 *  (Photoshop, etc.), a separate OS process this app's WebView can't see input events from.
 *  Returns 0 (never idle) on the web build or any platform without a native idle source wired
 *  up, so callers degrade to "always active" rather than mis-flagging everyone as idle. */
async function getSystemIdleSeconds(): Promise<number> {
  if (!isTauri()) return 0;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<number>("get_system_idle_seconds");
}

export const localSyncService = {
  isTauri,
  revealInFileManager,
  openFolderInFileManager,
  openExternalUrl,
  downloadToMount,
  getSystemIdleSeconds,
  pickFolder,
  notifyDownload,

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
