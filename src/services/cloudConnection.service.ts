import type { CloudProvider } from "@/types";
import { apiClient } from "@/services/api.service";

const PROVIDER_PATH: Record<CloudProvider, string> = {
  "google-drive": "google",
  onedrive: "onedrive",
  dropbox: "dropbox",
  box: "box",
};

interface AuthUrlResponse {
  authUrl?: string;
  state?: string;
  configured: boolean;
  error?: string;
}

export interface CloudBrowseItem {
  id: string;
  name: string;
  isFolder: boolean;
  size: number | null;
}

interface CloudConnectionDto {
  id: number;
  provider: string;
  status: string;
  storageUsedBytes: number | null;
  totalStorageBytes: number | null;
  fileCount: number | null;
  lastSyncedAt: number | null;
  connectedAt: number | null;
}

/** Providers with a real OAuth integration wired up on the backend. */
export const OAUTH_BACKED_PROVIDERS: CloudProvider[] = ["google-drive", "onedrive"];

export const cloudConnectionService = {
  async getAuthUrl(provider: CloudProvider): Promise<AuthUrlResponse> {
    const { data } = await apiClient.post<AuthUrlResponse>(`/cloud/${PROVIDER_PATH[provider]}/auth-url`);
    return data;
  },

  async exchangeCode(provider: CloudProvider, code: string): Promise<CloudConnectionDto> {
    const { data } = await apiClient.post<CloudConnectionDto>(`/cloud/${PROVIDER_PATH[provider]}/callback`, {
      code,
    });
    return data;
  },

  async browse(provider: CloudProvider, folderId?: string): Promise<CloudBrowseItem[]> {
    const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : "";
    const { data } = await apiClient.get<{ items: CloudBrowseItem[] }>(
      `/cloud/${PROVIDER_PATH[provider]}/browse${query}`
    );
    return data.items;
  },

  async getConnections(): Promise<CloudConnectionDto[]> {
    const { data } = await apiClient.get<CloudConnectionDto[]>("/cloud/connections");
    return data;
  },

  async importItems(
    provider: CloudProvider,
    batchId: string,
    items: CloudBrowseItem[]
  ): Promise<{ created: number; updated: number; errors: number }> {
    const { data } = await apiClient.post<{ result: { created: number; updated: number; errors: number } }>(
      `/cloud/${PROVIDER_PATH[provider]}/import`,
      {
        batchId,
        items: items.map((i) => ({ id: i.id, name: i.name, isFolder: i.isFolder })),
      }
    );
    return data.result;
  },

  async disconnect(provider: CloudProvider): Promise<void> {
    await apiClient.delete(`/cloud/${PROVIDER_PATH[provider]}/disconnect`);
  },
};
