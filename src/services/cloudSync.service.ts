import type { AssetFileType, CloudAccount, CloudProvider, CloudRemoteFile } from "@/types";
import { delay } from "@/utils/helpers";

export const PROVIDER_LABEL: Record<CloudProvider, string> = {
  "google-drive": "Google Drive",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
  box: "Box",
};

const PROVIDER_EMAIL: Record<CloudProvider, string> = {
  "google-drive": "jordan.k@gmail.com",
  dropbox: "jordan.k@dropbox.com",
  onedrive: "jordan.k@outlook.com",
  box: "jordan.k@box.com",
};

const REMOTE_FILES: CloudRemoteFile[] = [
  { id: "cf_1", name: "Lookbook_Cover_Draft", fileType: "PSD", sizeMb: 215 },
  { id: "cf_2", name: "ProductShot_Bag_01", fileType: "JPG", sizeMb: 18 },
  { id: "cf_3", name: "ProductShot_Bag_02", fileType: "JPG", sizeMb: 21 },
  { id: "cf_4", name: "BTS_Reel_Studio", fileType: "MP4", sizeMb: 640 },
  { id: "cf_5", name: "ColorGrade_LUT_Pack", fileType: "ZIP", sizeMb: 34 },
  { id: "cf_6", name: "RawScan_Fabric_Swatch", fileType: "TIFF", sizeMb: 142 },
];

export const cloudSyncService = {
  async connect(provider: CloudProvider): Promise<CloudAccount> {
    await delay(900);
    return { provider, email: PROVIDER_EMAIL[provider] };
  },

  async fetchRemoteFiles(): Promise<CloudRemoteFile[]> {
    await delay(1100);
    return REMOTE_FILES;
  },

  mimeTypeToFileType(mimeType: string): AssetFileType {
    if (mimeType.includes("photoshop")) return "PSD";
    if (mimeType === "image/tiff") return "TIFF";
    if (mimeType.startsWith("image/")) return "JPG";
    if (mimeType.startsWith("video/")) return "MP4";
    if (mimeType.includes("zip")) return "ZIP";
    return "OTHER";
  },
};
