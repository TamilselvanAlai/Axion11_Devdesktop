import type { Asset, AssetSortKey } from "@/types";

export function sortAssets(assets: Asset[], key: AssetSortKey, asc: boolean): Asset[] {
  const sorted = [...assets].sort((a, b) => {
    switch (key) {
      case "sizeMb":
        return a.sizeMb - b.sizeMb;
      case "updatedAt":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "assignee":
        return a.assignee.name.localeCompare(b.assignee.name);
      default:
        return String(a[key]).localeCompare(String(b[key]));
    }
  });
  return asc ? sorted : sorted.reverse();
}
