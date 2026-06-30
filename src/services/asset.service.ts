import type { Asset, AssetComment, AssetDetail, ProjectNode, ProjectSummary, AssetScope } from "@/types";
import { apiClient } from "@/services/api.service";

function scopeToQuery(scope: AssetScope): string {
  if (scope === "all" || scope === "recent" || scope === "transfers") return "";
  return `?projectId=${encodeURIComponent(scope.projectId)}`;
}

export interface CloudAssetIngestPayload {
  assigneeName: string;
  assigneeInitials: string;
  files: { id: string; name: string; fileType: string; sizeMb: number }[];
}

export const assetService = {
  async getProjectTree(): Promise<ProjectNode[]> {
    const { data } = await apiClient.get<ProjectNode[]>("/projects/tree");
    return data;
  },

  async listAssets(scope: AssetScope): Promise<Asset[]> {
    const { data } = await apiClient.get<Asset[]>(`/assets${scopeToQuery(scope)}`);
    return data;
  },

  async getFolderSummary(projectId: string): Promise<ProjectSummary[]> {
    const { data } = await apiClient.get<ProjectSummary[]>(`/projects/${encodeURIComponent(projectId)}/summary`);
    return data;
  },

  async getAssetDetail(assetId: string): Promise<AssetDetail | null> {
    try {
      const { data } = await apiClient.get<AssetDetail>(`/assets/${encodeURIComponent(assetId)}`);
      return data;
    } catch {
      return null;
    }
  },

  async getComments(assetId: string): Promise<AssetComment[]> {
    const { data } = await apiClient.get<AssetComment[]>(`/assets/${encodeURIComponent(assetId)}/comments`);
    return data;
  },

  async addComment(assetId: string, message: string): Promise<AssetComment> {
    const { data } = await apiClient.post<AssetComment>(`/assets/${encodeURIComponent(assetId)}/comments`, {
      message,
    });
    return data;
  },

  async ingestCloudAssets(payload: CloudAssetIngestPayload): Promise<Asset[]> {
    const { data } = await apiClient.post<Asset[]>("/projects/cloud-drive/assets", payload);
    return data;
  },
};
