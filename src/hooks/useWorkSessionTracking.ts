import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store";
import { workSessionService } from "@/services/workSession.service";
import { localSyncService } from "@/services/localSync.service";
import { assetEditSessionService } from "@/services/assetEditSession.service";

const HEARTBEAT_INTERVAL_MS = 60_000;
const CLOSE_SESSION_END_TIMEOUT_MS = 3_000;

/** Bounds a promise so a slow/hung network call can never block something time-sensitive (here,
 *  the window actually closing) — resolves to undefined if `ms` elapses first. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(undefined); }
    );
  });
}

/** Drives the real login-to-logout working-hours tracking used by the dashboard's stat cards.
 *  Mounted once, app-wide (see AppProviders):
 *  - starts a work session the moment a user token appears (login, Google sign-in, etc.)
 *  - sends a heartbeat every minute so the backend can tell "still working" from "app was closed"
 *  - records an "asset edited" tick whenever a locally-opened file re-syncs after being changed
 *    in a 3rd-party app, and ends that asset's edit-session (started from AssetInfoPanel's Open
 *    File/Retouch click) so its "time spent editing" duration gets recorded
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

    const interval = setInterval(() => {
      workSessionService.heartbeat().catch(() => undefined);
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!token || !localSyncService.isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    localSyncService
      .onSyncComplete((payload) => {
        workSessionService.recordEdit().catch(() => undefined);
        assetEditSessionService.end(payload.assetId).catch(() => undefined);
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
      const fn = await win.onCloseRequested(async (event) => {
        event.preventDefault();
        // Never let a slow/unreachable backend hold the window open — closing must always work.
        await withTimeout(workSessionService.end().catch(() => undefined), CLOSE_SESSION_END_TIMEOUT_MS);
        await win.destroy();
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
