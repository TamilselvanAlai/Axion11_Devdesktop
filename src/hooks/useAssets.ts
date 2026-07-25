import { useEffect } from "react";
import { assetService } from "@/services/asset.service";
import { localSyncService } from "@/services/localSync.service";
import { useAssetStore } from "@/store";
import type { AssetScope } from "@/types";

const REFRESH_INTERVAL_MS = 20_000;

export function useAssets(scope: AssetScope) {
  const { assets, status, setAssets, resetForNavigation, setCurrentScope } = useAssetStore();
  const scopeKey = typeof scope === "string" ? scope : scope.projectId;

  useEffect(() => {
    resetForNavigation();
    setCurrentScope(scope);
    assetService.listAssets(scope).then(setAssets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, setAssets, resetForNavigation, setCurrentScope]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    localSyncService.onSyncComplete(() => {
      assetService.listAssets(scope).then(setAssets);
    }).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, setAssets]);

  // Keeps the list live when another client (e.g. the website) uploads while this page sits
  // open — without this, assets only ever refresh on scope change, this instance's own
  // uploads, or a manual reload, so uploads from elsewhere silently never appear.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      assetService.listAssets(scope).then(setAssets).catch(() => undefined);
    };
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, setAssets]);

  return { assets, status };
}
