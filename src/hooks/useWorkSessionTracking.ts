import { useEffect, useRef } from "react";
import { useAuthStore, useAssetStore, useDashboardStore } from "@/store";
import { workSessionService } from "@/services/workSession.service";
import { localSyncService } from "@/services/localSync.service";
import { assetEditSessionService } from "@/services/assetEditSession.service";
import { dashboardService } from "@/services/dashboard.service";

const TICK_INTERVAL_MS = 30_000;
const TICK_INTERVAL_SECONDS = TICK_INTERVAL_MS / 1000;

/** No fresh system-wide input (mouse/keyboard, anywhere — not just this app's own window) for
 *  this long, *measured locally from ticks* (see the streak tracking below, not read as a raw
 *  absolute value) means the time since is excluded from Active Editing Time. Generous on
 *  purpose — tolerates a longer thinking/waiting pause mid-task without losing credit for it. */
const ACTIVE_IDLE_THRESHOLD_SECONDS = 10 * 60;

/** Same streak, a stricter bar for Time In App — "was the user at their desk at all" rather than
 *  "were they still mid-task". Deliberately shorter than the Active Editing Time bar above, so a
 *  4-minute silent gap can count as still-active-editing but already excluded from Time In App —
 *  that's the intended distinction between the two figures, not a bug. */
const APP_IDLE_THRESHOLD_SECONDS = 3 * 60;

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
  // Windows' idle clock ("seconds since the last physical input, anywhere on the system") is an
  // absolute value with no idea when *this* tracking session started — if the user was away from
  // the mouse for a while before opening a file, that stale reading otherwise bleeds straight
  // into the very first ticks of a brand-new, actually-active session and wrongly zeroes it out.
  // Tracking it as a delta between consecutive ticks sidesteps that entirely: the raw value only
  // ever climbs between real inputs and snaps back near zero the instant a new one happens, so "did
  // it drop since last tick" is a clean, self-contained signal for "did real input happen roughly
  // in the last tick's window" — independent of whatever the absolute number happened to be
  // before tracking even started. previousIdleSecondsRef is null until the first tick lands (no
  // delta possible yet — that first tick defaults to active, since starting the session/opening a
  // file is itself recent real interaction). idleStreakSecondsRef accumulates consecutive
  // no-fresh-input ticks — Active Editing Time and Time In App each compare this same streak
  // against their own bar (10 min / 3 min), rather than reacting to any single 30s gap, which
  // would zero out totally normal pauses between clicks.
  const previousIdleSecondsRef = useRef<number | null>(null);
  const idleStreakSecondsRef = useRef(0);

  useEffect(() => {
    if (!token) {
      started.current = false;
      previousIdleSecondsRef.current = null;
      idleStreakSecondsRef.current = 0;
      return;
    }
    if (started.current) return;
    started.current = true;

    workSessionService.start().catch(() => undefined);

    const interval = setInterval(async () => {
      const idleSeconds = await localSyncService.getSystemIdleSeconds().catch(() => 0);

      const previous = previousIdleSecondsRef.current;
      const freshInput = previous === null || idleSeconds < previous;
      previousIdleSecondsRef.current = idleSeconds;

      if (freshInput) {
        idleStreakSecondsRef.current = 0;
      } else {
        idleStreakSecondsRef.current += TICK_INTERVAL_SECONDS;
      }
      // idleForApp flips true first (3 min) on any sustained gap, idle (10 min) later — so
      // Time In App can end up less than Active Editing Time for the same stretch. That's the
      // intended distinction between the two, not a bug (see the threshold constants above).
      const idle = idleStreakSecondsRef.current >= ACTIVE_IDLE_THRESHOLD_SECONDS;
      const idleForApp = idleStreakSecondsRef.current >= APP_IDLE_THRESHOLD_SECONDS;

      workSessionService.heartbeat({ idle, idleForApp, elapsedSeconds: TICK_INTERVAL_SECONDS }).catch(() => undefined);

      // Updates the dashboard's Active Editing Time immediately, in lockstep with this tick —
      // no network round trip and no polling wait, since this hook already knows the outcome of
      // every tick the instant it happens. The backend heartbeat call above is still the source
      // of truth for what actually gets persisted; this only keeps the on-screen number honest
      // in between snapshot refetches (see dashboardStore.setSnapshot, which resets this back to
      // 0 once a fresh snapshot's own total supersedes it).
      if (!idle) {
        useDashboardStore.getState().bumpLiveActiveSeconds(TICK_INTERVAL_SECONDS);
      }

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
