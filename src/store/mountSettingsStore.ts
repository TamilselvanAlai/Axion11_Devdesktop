import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/utils/constants";

/** Root folder created on the selected drive/partition — e.g. D:\AxionDam\... */
export const MOUNT_ROOT_FOLDER = "AxionDam";

interface MountSettingsState {
  /** Drive mount point the user picked in Mount Settings, e.g. "C:\\" or "D:\\". Null = use app default. */
  mountPoint: string | null;
  cacheLimitGb: number;
  setMountPoint: (mountPoint: string | null) => void;
  setCacheLimitGb: (gb: number) => void;
}

export const useMountSettingsStore = create<MountSettingsState>()(
  persist(
    (set) => ({
      mountPoint: null,
      cacheLimitGb: 50,
      setMountPoint: (mountPoint) => set({ mountPoint }),
      setCacheLimitGb: (cacheLimitGb) => set({ cacheLimitGb }),
    }),
    { name: STORAGE_KEYS.mountSettings }
  )
);
