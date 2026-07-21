import { create } from "zustand";
import type { Asset, AssetFilters, AssetScope, AssetSortKey, AssetViewMode, LoadingState, ProjectNode, ProjectSummary } from "@/types";
import { assetService } from "@/services/asset.service";
import { findAncestorIds } from "@/utils/assetPath";

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
  /** The batch/folder node id of the currently selected asset, so the sidebar tree can
   *  highlight it even when it's not the node the current route is scoped to. */
  selectedAssetBatchId: string | null;
  multiSelectedIds: Set<string>;
  /** Scope backing the currently-displayed asset list, set by useAssets on every fetch —
   *  lets actions taken elsewhere (e.g. approve/reject in the detail panel) refresh the
   *  list without needing to know or re-derive the scope themselves. */
  currentScope: AssetScope | null;
  setProjectTree: (tree: ProjectNode[]) => void;
  setAssets: (assets: Asset[]) => void;
  setCurrentScope: (scope: AssetScope) => void;
  /** Re-fetches the asset list for whatever scope is currently displayed. No-op if nothing
   *  has been fetched yet (currentScope unset). */
  refetchAssets: () => Promise<void>;
  addAssets: (assets: Asset[]) => void;
  setFolderSummary: (summary: ProjectSummary[]) => void;
  setStatus: (status: LoadingState) => void;
  /** Marks loading without clearing the current list — the previously-viewed content stays on
   *  screen until the new fetch resolves and replaces it, instead of flashing empty in between. */
  resetForNavigation: () => void;
  setViewMode: (mode: AssetViewMode) => void;
  toggleSort: (key: AssetSortKey) => void;
  setFilter: <K extends keyof AssetFilters>(key: K, value: AssetFilters[K]) => void;
  clearFilters: () => void;
  toggleExpanded: (id: string) => void;
  expandAncestors: (ids: string[]) => void;
  selectAsset: (id: string | null) => void;
  /** Selects an asset and reveals it in the sidebar tree: expands every ancestor folder and
   *  marks its containing batch as highlighted, without navigating away from the current view. */
  selectAssetAndReveal: (asset: Asset) => void;
  toggleMultiSelect: (id: string) => void;
  selectRange: (ids: string[]) => void;
  clearMultiSelect: () => void;
}

export const useAssetStore = create<AssetStoreState>((set, get) => ({
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
  selectedAssetBatchId: null,
  multiSelectedIds: new Set(),
  currentScope: null,
  setProjectTree: (projectTree) => set({ projectTree }),
  setAssets: (assets) => set({ assets, status: "success" }),
  setCurrentScope: (currentScope) => set({ currentScope }),
  refetchAssets: async () => {
    const { currentScope } = get();
    if (!currentScope) return;
    const assets = await assetService.listAssets(currentScope);
    set({ assets, status: "success" });
  },
  addAssets: (newAssets) => set((state) => ({ assets: [...newAssets, ...state.assets] })),
  setFolderSummary: (folderSummary) => set({ folderSummary, status: "success" }),
  setStatus: (status) => set({ status }),
  resetForNavigation: () => set({ status: "loading" }),
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
  expandAncestors: (ids) =>
    set((state) => ({ expandedIds: new Set([...state.expandedIds, ...ids]) })),
  selectAsset: (selectedAssetId) => set({ selectedAssetId }),
  selectAssetAndReveal: (asset) =>
    set((state) => {
      const ancestorIds = asset.batchId ? findAncestorIds(state.projectTree, asset.batchId) : null;
      return {
        selectedAssetId: asset.id,
        selectedAssetBatchId: asset.batchId,
        expandedIds: ancestorIds ? new Set([...state.expandedIds, ...ancestorIds]) : state.expandedIds,
      };
    }),
  toggleMultiSelect: (id) =>
    set((state) => {
      const next = new Set(state.multiSelectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { multiSelectedIds: next };
    }),
  /** Adds every id in a shift-click range to the selection (union, not toggle). */
  selectRange: (ids) =>
    set((state) => ({ multiSelectedIds: new Set([...state.multiSelectedIds, ...ids]) })),
  clearMultiSelect: () => set({ multiSelectedIds: new Set() }),
}));
