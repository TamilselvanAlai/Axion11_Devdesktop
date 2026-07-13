import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { localSyncService } from "@/services/localSync.service";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const ERROR_DISPLAY_MS = 4000;

type Tone = "success" | "info" | "danger" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  info: "border-info/30 bg-info/10 text-info",
  danger: "border-danger/30 bg-danger/10 text-danger",
  muted: "border-border bg-white/5 text-muted-foreground",
};

function Pill({ tone, icon, label }: { tone: Tone; icon: React.ReactNode; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]}`}>
      {icon}
      {label}
    </span>
  );
}

/** Read-only indicator for the local (device-drive) sync that runs whenever an asset is
 *  opened and edited in a 3rd-party app — see local_sync.rs's file watcher. Replaces the
 *  old cloud "Connect Drive" flow in the topbar; this app only syncs to the local mount now. */
export function LocalSyncStatus() {
  const isTauri = localSyncService.isTauri();
  const isOnline = useNetworkStatus();
  const [errorUntil, setErrorUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;

    localSyncService.onSyncError(() => setErrorUntil(Date.now() + ERROR_DISPLAY_MS)).then((fn) => {
      if (cancelled) fn();
      else unsub = fn;
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [isTauri]);

  useEffect(() => {
    if (errorUntil === null) return;
    const timeout = setTimeout(() => setErrorUntil(null), Math.max(0, errorUntil - Date.now()));
    return () => clearTimeout(timeout);
  }, [errorUntil]);

  if (!isTauri) {
    return <Pill tone="muted" icon={<span className="size-1.5 rounded-full bg-muted-foreground" />} label="Local sync unavailable" />;
  }

  if (!isOnline) {
    return <Pill tone="danger" icon={<WifiOff className="size-2.5" />} label="Offline" />;
  }

  return (
    <div className="flex items-center gap-2">
      <Pill tone="success" icon={<span className="size-1.5 rounded-full bg-success" />} label="Cloud Connected" />
      {errorUntil !== null ? (
        <Pill tone="danger" icon={<AlertTriangle className="size-2.5" />} label="Sync error" />
      ) : (
        <Pill tone="info" icon={<RefreshCw className="size-2.5 animate-spin" />} label="Syncing" />
      )}
    </div>
  );
}
