import { useEffect } from "react";
import { assetService } from "@/services/asset.service";
import { useAssetStore } from "@/store";

export function useProjectTree() {
  const { projectTree, setProjectTree } = useAssetStore();

  useEffect(() => {
    if (projectTree.length) return;
    assetService.getProjectTree().then(setProjectTree);
  }, [projectTree.length, setProjectTree]);

  return projectTree;
}
