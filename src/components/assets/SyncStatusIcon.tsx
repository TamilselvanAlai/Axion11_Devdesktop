import { useEffect, useState } from "react";
import { CloudCheck, Cloud } from "lucide-react";
import { localSyncService } from "@/services/localSync.service";
import { buildAssetRelativePath } from "@/utils/assetPath";
import { useAssetStore, useMountSettingsStore } from "@/store";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types";

/** Shows whether this asset's file is downloaded/synced to this machine (desktop app only) —
 *  nothing renders in the web app or for assets not linked to a batch. */
export function SyncStatusIcon({ asset, className }: { asset: Asset; className?: string }) {
  const projectTree = useAssetStore((s) => s.projectTree);
  const localSyncTick = useAssetStore((s) => s.localSyncTick);
  const mountPoint = useMountSettingsStore((s) => s.mountPoint);
  const [synced, setSynced] = useState<boolean | null>(null);

  useEffect(() => {
    if (!localSyncService.isTauri() || !asset.batchId) {
      setSynced(null);
      return;
    }
    let cancelled = false;
    const relativePath = buildAssetRelativePath(projectTree, asset.batchId, asset.name, asset.id);
    localSyncService.getLocalAssetInfo({ relativePath, mountRoot: mountPoint }).then((info) => {
      if (!cancelled) setSynced(info !== null);
    });
    return () => {
      cancelled = true;
    };
  }, [asset.id, asset.batchId, asset.name, projectTree, mountPoint, localSyncTick]);

  if (synced === null) return null;

  return (
    <span title={synced ? "Synced to desktop" : "Not downloaded locally"} className="inline-flex shrink-0">
      {synced ? (
        <CloudCheck className={cn("text-emerald-500", className)} />
      ) : (
        <Cloud className={cn("text-muted-foreground/40", className)} />
      )}
    </span>
  );
}
