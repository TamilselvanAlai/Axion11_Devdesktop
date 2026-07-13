import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store";
import { workSessionService } from "@/services/workSession.service";
import { localSyncService } from "@/services/localSync.service";

const HEARTBEAT_INTERVAL_MS = 60_000;

/** Drives the real login-to-logout working-hours tracking used by the dashboard's stat cards.
 *  Mounted once, app-wide (see AppProviders):
 *  - starts a work session the moment a user token appears (login, Google sign-in, etc.)
 *  - sends a heartbeat every minute so the backend can tell "still working" from "app was closed"
 *  - records an "asset edited" tick whenever a locally-opened file re-syncs after being changed
 *    in a 3rd-party app
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
      .onSyncComplete(() => {
        workSessionService.recordEdit().catch(() => undefined);
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
        await workSessionService.end().catch(() => undefined);
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
