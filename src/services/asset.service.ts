import type {
  Asset,
  AssetComment,
  AssetDetail,
  AssetFileType,
  AssetScope,
  AssetStatus,
  BatchApiDto,
  BatchWithUploadsApiDto,
  CommentApiDto,
  ImageUploadApiDto,
  ProjectNode,
  ProjectSummary,
  ProjectTreeApiNode,
} from "@/types";
import { apiClient } from "@/services/api.service";
import { getInitials } from "@/utils/formatters";

// ── Converters ───────────────────────────────────────────────────────────

function mimeToFileType(mime: string | null, fileName?: string | null): AssetFileType {
  const m = (mime ?? "").toLowerCase();
  if (m.includes("photoshop") || m.includes("psd")) return "PSD";
  if (m === "image/tiff" || m.includes("tiff")) return "TIFF";
  if (m.includes("cr3")) return "CR3";
  if (m === "image/jpeg" || m === "image/jpg" || m.includes("jpeg")) return "JPG";
  if (m.includes("png")) return "PNG";
  if (m.startsWith("video/")) return "MP4";
  if (m.includes("zip") || m.includes("compressed")) return "ZIP";

  // The content-type reported at upload time is often generic or missing entirely — browsers
  // have no registered MIME type for PSD/CR3, and some upload paths lose it altogether — so
  // fall back to the filename extension rather than showing everything as "OTHER".
  const ext = (fileName ?? "").toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "psd":          return "PSD";
    case "tif":
    case "tiff":         return "TIFF";
    case "cr3":          return "CR3";
    case "jpg":
    case "jpeg":         return "JPG";
    case "png":          return "PNG";
    case "mp4":
    case "mov":          return "MP4";
    case "zip":          return "ZIP";
    default:             return "OTHER";
  }
}

function toAssetStatus(approvalStatus: string | null, qcCheck: string | null): AssetStatus {
  switch ((approvalStatus ?? "").toLowerCase()) {
    case "approved": return "approved";
    case "rejected": return "rejected";
    case "live":     return "live";
  }

  // Old QC-based fallback: before a human explicitly approves/rejects an asset
  // (approvalStatus unset), fall back to the automated quality check result —
  // this is how status used to be derived before human approvals were added.
  switch ((qcCheck ?? "").toUpperCase()) {
    case "PASSED":   return "approved";
    case "REJECTED": return "rejected";
    default:         return "draft";
  }
}

const THUMB_COLORS = ["amber", "rose", "slate", "pink", "emerald", "blue", "violet", "stone"];

function toAsset(dto: ImageUploadApiDto): Asset {
  const sizeMb = dto.fileSize ? Math.round((dto.fileSize / (1024 * 1024)) * 10) / 10 : 0;
  const assigneeName = dto.assignedToName ?? dto.uploadedBy ?? "Unassigned";
  return {
    id: String(dto.id),
    projectId: dto.projectId ? String(dto.projectId) : "",
    batchId: dto.batchId ? `b-${dto.batchId}` : null,
    name: dto.fileName,
    status: toAssetStatus(dto.approvalStatus, dto.imageQualityQcCheck),
    fileType: mimeToFileType(dto.contentType, dto.fileName),
    sizeMb,
    version: `v${dto.versionNumber ?? 1}`,
    assignee: { name: assigneeName, initials: getInitials(assigneeName) },
    updatedAt: dto.createdAt ?? new Date().toISOString(),
    // Prefer the generated preview (small, web-friendly JPEG) over the full-size original —
    // originals can be huge TIFF/PSD/RAW files that browsers can't even decode as <img>.
    thumbnailColor: dto.previewUrl || dto.publicUrl || THUMB_COLORS[dto.id % THUMB_COLORS.length],
  };
}

function toAssetDetail(dto: ImageUploadApiDto): AssetDetail {
  return {
    ...toAsset(dto),
    filename: dto.fileName,
    sku: dto.imageTitle ?? "—",
    batch: dto.batchId ? String(dto.batchId) : "—",
    etaAt: dto.createdAt ?? "—",
    modifiedAt: dto.createdAt ?? "—",
    checksumOk: dto.imageQualityQcCheck === "PASSED",
    locked: false,
    downloadUrl: dto.publicUrl || dto.previewUrl || null,
  };
}

function toAssetComment(dto: CommentApiDto, assetId: string): AssetComment {
  return {
    id: String(dto.id),
    assetId,
    author: { name: dto.authorName, initials: getInitials(dto.authorName) },
    message: dto.text,
    createdAt: dto.createdAt,
  };
}

function toProjectNode(node: ProjectTreeApiNode): ProjectNode {
  return {
    id: node.id,
    name: node.name,
    children: (node.children ?? [])
      .filter((c) => c.type !== "asset")
      .map(toProjectNode),
  };
}

// ── Public service ────────────────────────────────────────────────────────

export const assetService = {
  async getProjectTree(): Promise<ProjectNode[]> {
    const { data } = await apiClient.get<ProjectTreeApiNode[]>("/projects/tree");
    return data.filter((n) => n.type !== "asset").map(toProjectNode);
  },

  /** Top-level projects list — lets "Projects" land on a folder picker instead of a flat asset dump. */
  async getProjectsList(): Promise<ProjectSummary[]> {
    const { data } = await apiClient.get<ProjectTreeApiNode[]>("/projects/tree");
    return data
      .filter((n) => n.type === "project")
      .map((n) => ({
        id: n.id,
        name: n.name,
        assetCount: n.totalAssets ?? 0,
        dueDate: n.dueDate ?? "—",
      }));
  },

  async searchByName(query: string): Promise<Asset[]> {
    const { data } = await apiClient.get<ImageUploadApiDto[]>(
      `/uploads/search-by-name?q=${encodeURIComponent(query)}`
    );
    return data.map(toAsset);
  },

  async listAssets(scope: AssetScope): Promise<Asset[]> {
    if (scope === "recent") {
      const { data } = await apiClient.get<ImageUploadApiDto[]>("/audit/recent-assets?days=7");
      return data.map(toAsset);
    }
    if (scope === "transfers") {
      const { data } = await apiClient.get<ImageUploadApiDto[]>("/audit/transfers?days=7");
      return data.map(toAsset);
    }
    if (scope === "all") {
      const { data } = await apiClient.get<ImageUploadApiDto[]>("/uploads");
      return data.map(toAsset);
    }

    // Tree node ids are prefixed ("p-1" for projects, "b-5" for batches/folders).
    // A batch node's assets live on the batch itself, not under /uploads?projectId=.
    if (scope.projectId.startsWith("b-")) {
      const batchId = scope.projectId.slice(2);
      const { data } = await apiClient.get<BatchWithUploadsApiDto>(`/batches/${batchId}`);
      return (data.imageUploads ?? []).map(toAsset);
    }

    const numericProjectId = scope.projectId.startsWith("p-") ? scope.projectId.slice(2) : scope.projectId;
    const { data } = await apiClient.get<ImageUploadApiDto[]>(
      `/uploads?projectId=${encodeURIComponent(numericProjectId)}`
    );
    return data.map(toAsset);
  },

  async getFolderSummary(nodeId: string): Promise<ProjectSummary[]> {
    // Tree node ids are prefixed ("p-1" for projects, "b-5" for batches/folders) —
    // the backend only accepts a raw numeric projectId, so resolve accordingly.
    let numericProjectId: number;
    let parentBatchId: number | null;

    if (nodeId.startsWith("b-")) {
      const batchId = Number(nodeId.slice(2));
      const { data: batch } = await apiClient.get<BatchApiDto>(`/batches/${batchId}`);
      numericProjectId = batch.projectId ?? batchId;
      parentBatchId = batchId;
    } else {
      numericProjectId = Number(nodeId.startsWith("p-") ? nodeId.slice(2) : nodeId);
      parentBatchId = null;
    }

    const { data } = await apiClient.get<BatchApiDto[]>(`/batches?projectId=${numericProjectId}`);
    return data
      .filter((b) => b.parentBatchId === parentBatchId)
      .map((b) => ({
        id: `b-${b.id}`,
        name: b.name,
        assetCount: b.totalImages ?? 0,
        dueDate: b.dueDate ?? "—",
      }));
  },

  async getAssetDetail(assetId: string): Promise<AssetDetail | null> {
    try {
      const { data } = await apiClient.get<ImageUploadApiDto>(`/uploads/${encodeURIComponent(assetId)}`);
      return toAssetDetail(data);
    } catch {
      return null;
    }
  },

  /** QC actions — approve/reject the current version of this asset. */
  async approveAsset(assetId: string): Promise<void> {
    await apiClient.post(`/assets/${encodeURIComponent(assetId)}/approve`);
  },

  async rejectAsset(assetId: string): Promise<void> {
    await apiClient.post(`/assets/${encodeURIComponent(assetId)}/reject`);
  },

  /** Publishes an already-approved asset live. Backend rejects this unless the asset is
   *  currently "approved". */
  async publishAsset(assetId: string): Promise<void> {
    await apiClient.post(`/assets/${encodeURIComponent(assetId)}/publish`);
  },

  async getComments(assetId: string): Promise<AssetComment[]> {
    const { data } = await apiClient.get<CommentApiDto[]>(
      `/uploads/${encodeURIComponent(assetId)}/comments`
    );
    return data.map((c) => toAssetComment(c, assetId));
  },

  async addComment(assetId: string, message: string): Promise<AssetComment> {
    const { data } = await apiClient.post<CommentApiDto>(
      `/uploads/${encodeURIComponent(assetId)}/comments`,
      { text: message }
    );
    return toAssetComment(data, assetId);
  },

  /** Logs a download without transferring the file — for flows that fetch the file directly
   *  from its public storage URL (e.g. Open File) instead of through the backend. */
  async recordDownload(assetId: string): Promise<void> {
    await apiClient.post(`/uploads/${encodeURIComponent(assetId)}/record-download`).catch(() => undefined);
  },
};
