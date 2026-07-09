import { useEffect, useMemo } from "react";
import { assetService } from "@/services/asset.service";
import { localSyncService } from "@/services/localSync.service";
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
  const { projectTree, assets, folderSummary, status, setAssets, setFolderSummary, resetForNavigation } =
    useAssetStore();

  const node = useMemo(() => findNode(projectTree, projectId), [projectTree, projectId]);
  const isFolder = Boolean(node?.children?.length);

  useEffect(() => {
    if (!node) return;
    // Clear the previous node's list synchronously so the skeleton shows immediately —
    // otherwise stale content sits frozen on screen for the whole fetch, then jumps.
    resetForNavigation();

    if (node.children?.length) {
      assetService.getFolderSummary(projectId).then(setFolderSummary);
    } else {
      assetService.listAssets({ projectId }).then(setAssets);
    }
  }, [node, projectId, setAssets, setFolderSummary, resetForNavigation]);

  // A locally-edited file just got auto-uploaded as a new version — refresh the list so
  // it shows up (updated size/version) without the user having to navigate away and back.
  useEffect(() => {
    if (!node || node.children?.length) return;
    let unlisten: (() => void) | undefined;

    localSyncService.onSyncComplete((payload) => {
      if (`b-${payload.batchId}` !== node.id) return;
      assetService.listAssets({ projectId }).then(setAssets);
    }).then((fn) => { unlisten = fn; });

    return () => unlisten?.();
  }, [node, projectId, setAssets]);

  return { node, isFolder, assets, folderSummary, status };
}
