import { useEffect } from "react";
import { assetService } from "@/services/asset.service";
import { useAssetStore } from "@/store";

/** Fetches once on mount, then refetches whenever the app window regains focus — so items
 *  created elsewhere (e.g. on the web app) show up without needing a restart, while normal
 *  navigation within a session doesn't re-hit the API on every render. */
export function useProjectTree() {
  const { projectTree, setProjectTree } = useAssetStore();

  useEffect(() => {
    assetService.getProjectTree().then(setProjectTree);
    function onFocus() {
      assetService.getProjectTree().then(setProjectTree);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [setProjectTree]);

  return projectTree;
}
