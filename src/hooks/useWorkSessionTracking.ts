import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store";
import { workSessionService } from "@/services/workSession.service";
import { localSyncService } from "@/services/localSync.service";
import { assetEditSessionService } from "@/services/assetEditSession.service";

const HEARTBEAT_INTERVAL_MS = 60_000;

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
