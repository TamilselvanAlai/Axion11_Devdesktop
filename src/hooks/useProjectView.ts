import { useEffect, useMemo, useState } from "react";
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
  const { projectTree, assets, folderSummary, status, setAssets, setFolderSummary, resetForNavigation, refetchProjectTree } =
    useAssetStore();

  const node = useMemo(() => findNode(projectTree, projectId), [projectTree, projectId]);
  const isFolder = Boolean(node?.children?.length);

  // A batch/project can briefly be missing from the tree right after it was just created (e.g.
  // a folder upload navigated into before the tree refetch it kicked off has landed) — instead
  // of the caller flashing a hard "not found" the instant that happens, retry a few times first.
  const [resolving, setResolving] = useState(!node);
  useEffect(() => {
    if (node) {
      setResolving(false);
      return;
    }
    setResolving(true);
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        if (cancelled) return;
        await refetchProjectTree().catch(() => undefined);
      }
      if (!cancelled) setResolving(false);
    })();
    return () => {
      cancelled = true;
    };
    // Re-run when navigating to a different id, or once the node newly resolves (to bail out
    // immediately) — not on every tree refetch, which would restart the loop pointlessly since
    // `node` is a fresh object reference each time even when still unresolved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, Boolean(node)]);

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

  return { node, isFolder, assets, folderSummary, status, resolving };
}
