import type { Asset, AssetFilters } from "@/types";

export function filterAssets(assets: Asset[], filters: AssetFilters): Asset[] {
  return assets.filter((asset) => {
    if (filters.status && asset.status !== filters.status) return false;
    if (filters.fileType && asset.fileType !== filters.fileType) return false;
    if (filters.batchId && asset.batchId !== filters.batchId) return false;
    if (filters.assigneeName && asset.assignee.name !== filters.assigneeName) return false;
    return true;
  });
}

export function hasActiveFilters(filters: AssetFilters): boolean {
  return Boolean(filters.status || filters.fileType || filters.batchId || filters.assigneeName);
}
