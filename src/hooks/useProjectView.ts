import { useEffect, useMemo } from "react";
import { assetService } from "@/services/asset.service";
import { useAssetStore } from "@/store";
import type { ProjectNode } from "@/types";

function findNode(nodes: ProjectNode[], id: string): ProjectNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function useProjectView(projectId: string) {
  const { projectTree, assets, folderSummary, status, setAssets, setFolderSummary, setStatus } =
    useAssetStore();

  const node = useMemo(() => findNode(projectTree, projectId), [projectTree, projectId]);
  const isFolder = Boolean(node?.children?.length);

  useEffect(() => {
    if (!node) return;
    setStatus("loading");

    if (node.children?.length) {
      assetService.getFolderSummary(projectId).then(setFolderSummary);
    } else {
      assetService.listAssets({ projectId }).then(setAssets);
    }
  }, [node, projectId, setAssets, setFolderSummary, setStatus]);

  return { node, isFolder, assets, folderSummary, status };
}
