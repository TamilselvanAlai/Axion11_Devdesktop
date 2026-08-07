import { useEffect, useRef } from "react";
import { useAuthStore, useAssetStore, useDashboardStore } from "@/store";
import { workSessionService } from "@/services/workSession.service";
import { localSyncService } from "@/services/localSync.service";
import { assetEditSessionService } from "@/services/assetEditSession.service";
import { dashboardService } from "@/services/dashboard.service";

const TICK_INTERVAL_MS = 30_000;
const TICK_INTERVAL_SECONDS = TICK_INTERVAL_MS / 1000;

/** No system-wide input (mouse/keyboard, anywhere — not just this app's own window) for this
 *  long means the time since is excluded from active-editing time. Matches the product
 *  requirement of not counting time the desktop app sat idle. */
const IDLE_THRESHOLD_SECONDS = 10 * 60;

/** Drives the real login-to-logout working-hours tracking used by the dashboard's stat cards.
 *  Mounted once, app-wide (see AppProviders):
 *  - starts a work session the moment a user token appears (login, Google sign-in, etc.)
 *  - every 30s, checks the OS-wide idle clock (see localSyncService.getSystemIdleSeconds — reads
 *    real system input, since the user's actual activity happens inside a 3rd-party editor like
 *    Photoshop, a separate process this app's own window can't see events from) and reports
 *    whether that tick counted as active or idle, both for the overall work session and for
 *    whichever asset currently has an open edit session (see AssetInfoPanel/assetStore's
 *    openEditingAssetId) — this is what turns "app was open for an hour" into "actually active
 *    for 40 of those 60 minutes", per-asset as well as overall.
 *  - records an "asset edited" tick whenever a locally-opened file re-syncs after being changed
 *    in a 3rd-party app, closes out the edit-session that was open up to that save (started from
 *    AssetInfoPanel's Open File/Retouch click, or from a previous save's restart below) so its
 *    idle-corrected "time spent editing" gets finalized, and immediately re-opens tracking
 *    against the resulting version (almost always the same "VE" row updated in place — see
 *    local_sync.rs) — the local file watcher keeps running after a save until the user switches
 *    assets or logs out, so further edits before the next save need to keep accumulating too
 *  - on desktop, closes the session when the window is closed even if the user never hit Logout */
export function useWorkSessionTracking() {
  const token = useAuthStore((state) => state.token);
  const started = useRef(false);

  useEffect(() => {
    if (!token) {
      started.current = false;
      return;
    }
    if (started.current) return;
    started.current = true;

    workSessionService.start().catch(() => undefined);

    const interval = setInterval(async () => {
      const idleSeconds = await localSyncService.getSystemIdleSeconds().catch(() => 0);
      const idle = idleSeconds >= IDLE_THRESHOLD_SECONDS;

      workSessionService.heartbeat({ idle, elapsedSeconds: TICK_INTERVAL_SECONDS }).catch(() => undefined);

      const openEditingAssetId = useAssetStore.getState().openEditingAssetId;
      if (openEditingAssetId) {
        assetEditSessionService
          .tick(openEditingAssetId, { idle, elapsedSeconds: TICK_INTERVAL_SECONDS })
          .catch(() => undefined);
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!token || !localSyncService.isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    localSyncService
      .onSyncComplete((payload) => {
        workSessionService.recordEdit().catch(() => undefined);

        // payload.assetId is the *original* id captured once when this file's local watcher
        // started (see local_sync.rs's start_watching) — it never changes across repeat saves of
        // the same watched file, even though the actual open edit-session has since moved onto
        // the freshly created "VE" version row. openEditingAssetId (this frontend's own record of
        // what it last called .start() with) is the id that's actually still open, so it — not
        // payload.assetId — is what has to be passed to .end() from the second save onward, or
        // the id mismatch means the backend silently finds nothing to close.
        const { openEditingAssetId, setOpenEditingAssetId, bumpLocalSyncTick } = useAssetStore.getState();
        assetEditSessionService.end(openEditingAssetId ?? payload.assetId).catch(() => undefined);

        // The local file watcher keeps running after a save — it only stops when the user opens
        // a different asset or logs out (see local_sync.rs) — and every save before QC approval
        // updates that same VE row in place rather than forking a new one. So a save here almost
        // always means "still editing, will likely save again," not "done." Re-opening tracking
        // immediately against payload.newAssetId (the VE row) keeps whatever's edited between
        // this save and the next one attributed to the same version instead of going untracked.
        assetEditSessionService.start(payload.newAssetId).catch(() => undefined);
        setOpenEditingAssetId(payload.newAssetId);

        bumpLocalSyncTick();

        // The dashboard's stat cards (Assets Edited / Active Editing Time) are otherwise only
        // refreshed by useDashboardAutoRefresh's 60s poll — a save should show up right away
        // instead of leaving the just-recorded edit invisible for up to a minute. Only bothers
        // refetching if a snapshot is already loaded (i.e. the dashboard has been visited this
        // session); if it hasn't, the initial load will already pick up current numbers.
        if (useDashboardStore.getState().snapshot) {
          dashboardService.getSnapshot().then(useDashboardStore.getState().setSnapshot).catch(() => undefined);
        }
      })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [token]);

  useEffect(() => {
    if (!localSyncService.isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      // Deliberately doesn't call event.preventDefault() — the window always closes immediately
      // via Tauri's default handling, completely independent of whether this request finishes.
      // This is best-effort only: if the window closes before it completes, the next login's
      // stale-session recovery (WorkSessionService.startSession) closes the session out anyway,
      // using its last heartbeat as the end time. A previous version of this intercepted the
      // close event to await this call first (with a timeout as a safety net) — that pattern is
      // inherently riskier than not intercepting at all, since it makes closing depend on JS
      // execution completing, so it's not worth reintroducing even with a shorter timeout.
      const fn = await win.onCloseRequested(() => {
        workSessionService.end().catch(() => undefined);
      });
      if (cancelled) fn();
      else unlisten = fn;
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}
