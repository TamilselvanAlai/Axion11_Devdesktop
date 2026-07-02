import type { GoogleAccount, GoogleDriveFile } from "@/types";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(
      "Google Drive requires the desktop app. Launch with `npm run tauri dev` instead of `npm run dev`."
    );
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

export const googleDriveService = {
  isTauri,

  async login(): Promise<GoogleAccount> {
    return tauriInvoke<GoogleAccount>("google_oauth_login");
  },

  async listFiles(): Promise<GoogleDriveFile[]> {
    return tauriInvoke<GoogleDriveFile[]>("google_drive_list_files");
  },

  async logout(): Promise<void> {
    await tauriInvoke("google_oauth_logout");
  },
};
