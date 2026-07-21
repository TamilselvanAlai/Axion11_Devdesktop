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
    resetForNavigation();

    if (node.children?.length) {
      assetService.getFolderSummary(projectId).then(setFolderSummary);
    } else {
      assetService.listAssets({ projectId }).then(setAssets);
    }
    // Keyed on node.id/isFolder (not `node` itself) — `node` is a fresh object reference every
    // time the project tree refetches (e.g. on window focus), even when nothing about the
    // currently-viewed node actually changed. Keying on it would re-trigger this fetch on every
    // background tree refresh, flashing the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id, isFolder, projectId, setAssets, setFolderSummary, resetForNavigation]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id, isFolder, projectId, setAssets]);

  return { node, isFolder, assets, folderSummary, status };
}
