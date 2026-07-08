import { create } from "zustand";
import type { Asset, AssetFilters, AssetSortKey, AssetViewMode, LoadingState, ProjectNode, ProjectSummary } from "@/types";

const EMPTY_FILTERS: AssetFilters = { status: null, fileType: null, batchId: null, assigneeName: null };

interface AssetStoreState {
  projectTree: ProjectNode[];
  assets: Asset[];
  folderSummary: ProjectSummary[];
  status: LoadingState;
  viewMode: AssetViewMode;
  sortKey: AssetSortKey;
  sortAsc: boolean;
  filters: AssetFilters;
  expandedIds: Set<string>;
  selectedAssetId: string | null;
  setProjectTree: (tree: ProjectNode[]) => void;
  setAssets: (assets: Asset[]) => void;
  addAssets: (assets: Asset[]) => void;
  setFolderSummary: (summary: ProjectSummary[]) => void;
  setStatus: (status: LoadingState) => void;
  setViewMode: (mode: AssetViewMode) => void;
  toggleSort: (key: AssetSortKey) => void;
  setFilter: <K extends keyof AssetFilters>(key: K, value: AssetFilters[K]) => void;
  clearFilters: () => void;
  toggleExpanded: (id: string) => void;
  selectAsset: (id: string | null) => void;
}

export const useAssetStore = create<AssetStoreState>((set) => ({
  projectTree: [],
  assets: [],
  folderSummary: [],
  status: "idle",
  viewMode: "list",
  sortKey: "updatedAt",
  sortAsc: false,
  filters: EMPTY_FILTERS,
  expandedIds: new Set(["ss25-campaign", "aw25-campaign"]),
  selectedAssetId: null,
  setProjectTree: (projectTree) => set({ projectTree }),
  setAssets: (assets) => set({ assets, status: "success" }),
  addAssets: (newAssets) => set((state) => ({ assets: [...newAssets, ...state.assets] })),
  setFolderSummary: (folderSummary) => set({ folderSummary, status: "success" }),
  setStatus: (status) => set({ status }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleSort: (key) =>
    set((state) => ({
      sortKey: key,
      sortAsc: state.sortKey === key ? !state.sortAsc : true,
    })),
  setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),
  clearFilters: () => set({ filters: EMPTY_FILTERS }),
  toggleExpanded: (id) =>
    set((state) => {
      const next = new Set(state.expandedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedIds: next };
    }),
  selectAsset: (selectedAssetId) => set({ selectedAssetId }),
}));
