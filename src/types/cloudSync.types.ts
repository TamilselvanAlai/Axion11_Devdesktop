import type { AssetFileType } from "./asset.types";

export type CloudProvider = "google-drive" | "dropbox" | "onedrive" | "box";

export type CloudSyncStatus = "disconnected" | "connecting" | "connected" | "syncing" | "synced" | "error";

export interface CloudAccount {
  provider: CloudProvider;
  email: string;
}

export interface CloudRemoteFile {
  id: string;
  name: string;
  fileType: AssetFileType;
  sizeMb: number;
}

export interface GoogleAccount {
  email: string;
  name: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  sizeMb: number;
}
