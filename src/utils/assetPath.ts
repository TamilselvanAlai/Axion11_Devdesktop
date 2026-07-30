import type { ProjectNode } from "@/types";

/** The names of every ancestor folder (project → … → targetId), targetId included — the full
 *  breadcrumb trail for a node, e.g. ["Test01", "B3", "002", "SUBB001"]. */
export function findAncestorPath(nodes: ProjectNode[], targetId: string, trail: string[] = []): string[] | null {
  for (const node of nodes) {
    const nextTrail = [...trail, node.name];
    if (node.id === targetId) return nextTrail;
    if (node.children?.length) {
      const found = findAncestorPath(node.children, targetId, nextTrail);
      if (found) return found;
    }
  }
  return null;
}

/** Mirrors the project tree's folder names into a local relative path for a downloaded asset.
 *  Returns null if batchNodeId isn't found in tree (e.g. the tree hasn't loaded yet after a
 *  fresh app start) — callers must not fall back to a bare filename in that case, since that
 *  would silently produce a different path than the one used when the asset was downloaded. */
export function buildAssetRelativePath(tree: ProjectNode[], batchNodeId: string, filename: string): string | null {
  const ancestors = findAncestorPath(tree, batchNodeId);
  if (!ancestors) return null;
  return [...ancestors, filename].join("/");
}

/** Flattens the tree into a pickable list of batch/sub-batch targets (excludes project-root
 *  nodes — assets always move into a batch, never directly into a project) for the "Move to…"
 *  dropdown, with each label showing its full path so same-named sub-batches stay distinguishable. */
export function flattenBatchOptions(nodes: ProjectNode[], trail: string[] = []): { id: string; label: string }[] {
  const options: { id: string; label: string }[] = [];
  for (const node of nodes) {
    const nextTrail = [...trail, node.name];
    if (node.type === "batch") {
      options.push({ id: node.id, label: nextTrail.join(" / ") });
    }
    if (node.children?.length) {
      options.push(...flattenBatchOptions(node.children, nextTrail));
    }
  }
  return options;
}

/** The ids of every ancestor folder (project → …→ parent batch) leading to targetId, targetId included. */
export function findAncestorIds(nodes: ProjectNode[], targetId: string, trail: string[] = []): string[] | null {
  for (const node of nodes) {
    const nextTrail = [...trail, node.id];
    if (node.id === targetId) return nextTrail;
    if (node.children?.length) {
      const found = findAncestorIds(node.children, targetId, nextTrail);
      if (found) return found;
    }
  }
  return null;
}
