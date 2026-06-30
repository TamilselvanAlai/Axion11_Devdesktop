import { invoke } from "@tauri-apps/api/core";
import type { GoogleAccount, GoogleDriveFile } from "@/types";

export const googleDriveService = {
  async login(): Promise<GoogleAccount> {
    return invoke<GoogleAccount>("google_oauth_login");
  },

  async listFiles(): Promise<GoogleDriveFile[]> {
    return invoke<GoogleDriveFile[]>("google_drive_list_files");
  },

  async logout(): Promise<void> {
    await invoke("google_oauth_logout");
  },
};
