export interface LocalDrive {
  id: string;
  name: string;
  mountPoint: string;
  totalBytes: number;
  availableBytes: number;
  removable: boolean;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export const systemInfoService = {
  isTauri,

  async listLocalDrives(): Promise<LocalDrive[]> {
    if (!isTauri()) {
      throw new Error("Real drive info requires the desktop app. Launch with `npm run tauri dev`.");
    }
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<LocalDrive[]>("list_local_drives");
  },
};
