import { create } from "zustand";
import type { Asset, LoadingState } from "@/types";

interface AssetStoreState {
  assets: Asset[];
  status: LoadingState;
  setAssets: (assets: Asset[]) => void;
  setStatus: (status: LoadingState) => void;
}

export const useAssetStore = create<AssetStoreState>((set) => ({
  assets: [],
  status: "idle",
  setAssets: (assets) => set({ assets, status: "success" }),
  setStatus: (status) => set({ status }),
}));
