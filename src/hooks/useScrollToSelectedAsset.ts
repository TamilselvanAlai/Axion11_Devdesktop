import { useEffect } from "react";

/** Scrolls the DOM node for the currently-selected asset into view — used so a search result
 *  (or any other jump-to-asset action) actually lands the user on it in the center list/grid. */
export function useScrollToSelectedAsset(selectedAssetId: string | null, deps: readonly unknown[]) {
  useEffect(() => {
    if (!selectedAssetId) return;
    const el = document.querySelector(`[data-asset-row="${CSS.escape(selectedAssetId)}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssetId, ...deps]);
}
