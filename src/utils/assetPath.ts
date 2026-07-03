import type { ProjectNode } from "@/types";

function findAncestorPath(nodes: ProjectNode[], targetId: string, trail: string[] = []): string[] | null {
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

/** Mirrors the project tree's folder names into a local relative path for a downloaded asset. */
export function buildAssetRelativePath(tree: ProjectNode[], batchNodeId: string, filename: string): string {
  const ancestors = findAncestorPath(tree, batchNodeId);
  const folders = ancestors ?? [];
  return [...folders, filename].join("/");
}
