import type {
  Asset,
  AssetComment,
  AssetDetail,
  AssetDetailWithCommentsApiDto,
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
  if (m.includes("webp")) return "WEBP";
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
    case "webp":         return "WEBP";
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
  const status = toAssetStatus(dto.approvalStatus, dto.imageQualityQcCheck);
  // The established (VE) version doesn't show its provisional version number until QC decides
  // on it — it reads as "VE" while pending review, then the real v{n} once approved/rejected/
  // live. The number is already stored underneath (see ImageUploadService#syncEditedVersion),
  // this is purely a display choice so a not-yet-reviewed edit doesn't look like a done deal.
  const isPendingReview = status !== "approved" && status !== "rejected" && status !== "live";
  const version = dto.established && isPendingReview ? "VE" : `v${dto.versionNumber ?? 1}`;
  return {
    id: String(dto.id),
    projectId: dto.projectId ? String(dto.projectId) : "",
    batchId: dto.batchId ? `b-${dto.batchId}` : null,
    name: dto.fileName,
    status,
    fileType: mimeToFileType(dto.contentType, dto.fileName),
    sizeMb,
    version,
    assignee: { name: assigneeName, initials: getInitials(assigneeName) },
    updatedAt: dto.createdAt ?? new Date().toISOString(),
    // Prefer the generated preview (small, web-friendly JPEG) over the full-size original —
    // originals can be huge TIFF/PSD/RAW files that browsers can't even decode as <img>.
    thumbnailColor: dto.previewUrl || dto.publicUrl || THUMB_COLORS[dto.id % THUMB_COLORS.length],
    established: dto.established,
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
    annotationImageUrl: dto.annotationImageUrl ?? null,
  };
}

/** Collapses every version of the same upload down to just its latest version — the list view
 *  shows one row per asset; the full version chain is still available via the Compare view. */
function latestVersionsOnly(items: ImageUploadApiDto[]): ImageUploadApiDto[] {
  const latestByFamily = new Map<number, ImageUploadApiDto>();
  for (const item of items) {
    const familyId = item.originalUploadId ?? item.id;
    const current = latestByFamily.get(familyId);
    if (!current || (item.versionNumber ?? 1) > (current.versionNumber ?? 1)) {
      latestByFamily.set(familyId, item);
    }
  }
  return Array.from(latestByFamily.values());
}

function toProjectNode(node: ProjectTreeApiNode): ProjectNode {
  return {
    id: node.id,
    name: node.name,
    projectId: node.projectId,
    type: node.type === "batch" ? "batch" : "project",
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
    return latestVersionsOnly(data).map(toAsset);
  },

  async listAssets(scope: AssetScope): Promise<Asset[]> {
    if (scope === "recent") {
      const { data } = await apiClient.get<ImageUploadApiDto[]>("/audit/recent-assets?days=7");
      return latestVersionsOnly(data).map(toAsset);
    }
    if (scope === "transfers") {
      const { data } = await apiClient.get<ImageUploadApiDto[]>("/audit/transfers?days=7");
      return latestVersionsOnly(data).map(toAsset);
    }
    if (scope === "all") {
      const { data } = await apiClient.get<ImageUploadApiDto[]>("/uploads");
      return latestVersionsOnly(data).map(toAsset);
    }

    // Tree node ids are prefixed ("p-1" for projects, "b-5" for batches/folders).
    // A batch node's assets live on the batch itself, not under /uploads?projectId=.
    if (scope.projectId.startsWith("b-")) {
      const batchId = scope.projectId.slice(2);
      const { data } = await apiClient.get<BatchWithUploadsApiDto>(`/batches/${batchId}`);
      return latestVersionsOnly(data.imageUploads ?? []).map(toAsset);
    }

    const numericProjectId = scope.projectId.startsWith("p-") ? scope.projectId.slice(2) : scope.projectId;
    const { data } = await apiClient.get<ImageUploadApiDto[]>(
      `/uploads?projectId=${encodeURIComponent(numericProjectId)}`
    );
    return latestVersionsOnly(data).map(toAsset);
  },

  /** Uploads real files to a project or batch (tree node id decides which endpoint/param shape
   *  the backend expects). Batch uploads process asynchronously on the server — the response
   *  confirms the request was accepted, not that the rows exist yet. */
  async uploadFiles(files: File[], target: { type: "project" | "batch"; id: string }): Promise<void> {
    if (files.length === 0) return;
    const formData = new FormData();
    for (const file of files) formData.append("files", file, file.name);

    if (target.type === "batch") {
      const batchId = target.id.startsWith("b-") ? target.id.slice(2) : target.id;
      await apiClient.post(`/batches/upload/${encodeURIComponent(batchId)}`, formData, { timeout: 120000 });
    } else {
      const projectId = target.id.startsWith("p-") ? target.id.slice(2) : target.id;
      formData.append("projectId", projectId);
      await apiClient.post("/uploads", formData, { timeout: 120000 });
    }
  },

  /** Creates a brand-new batch (sub-folder) with the given files in one call — this is what a
   *  dropped OS folder maps to: the folder becomes a batch named after it, nested under
   *  wherever it was dropped, instead of its files being flattened into the drop target. */
  async createBatchWithFiles(name: string, files: File[], target: { type: "project" | "batch"; id: string; rootProjectId: string }): Promise<void> {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("projectId", target.rootProjectId);
    if (target.type === "batch") {
      const parentBatchId = target.id.startsWith("b-") ? target.id.slice(2) : target.id;
      formData.append("parentBatchId", parentBatchId);
    }
    for (const file of files) formData.append("files", file, file.name);
    await apiClient.post("/batches", formData, { timeout: 180000 });
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

  /** Every version in this asset's chain (v1 first), works regardless of which version's id is
   *  passed in — powers the version-compare view and the version strips in the table/panel. */
  async getVersions(assetId: string): Promise<Asset[]> {
    const { data } = await apiClient.get<ImageUploadApiDto[]>(
      `/uploads/${encodeURIComponent(assetId)}/versions`
    );
    return data.map(toAsset);
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

  /** Posts a comment, optionally with a pen-tool annotation baked into a transparent PNG
   *  (image) plus its mark center (x/y, natural-image pixels). Returns the asset's full,
   *  now-current comment list — the annotation-capable endpoint replies with the whole
   *  asset detail rather than just the new comment. */
  async addComment(
    assetId: string,
    message: string,
    annotation?: { image: string; x: number; y: number }
  ): Promise<AssetComment[]> {
    const { data } = await apiClient.post<AssetDetailWithCommentsApiDto>(
      `/assets/${encodeURIComponent(assetId)}/comments`,
      {
        text: message,
        annotationImage: annotation?.image,
        markX: annotation?.x,
        markY: annotation?.y,
      }
    );
    return (data.comments ?? []).map((c) => toAssetComment(c, assetId));
  },

  /** Logs a download without transferring the file — for flows that fetch the file directly
   *  from its public storage URL (e.g. Open File) instead of through the backend. */
  async recordDownload(assetId: string): Promise<void> {
    await apiClient.post(`/uploads/${encodeURIComponent(assetId)}/record-download`).catch(() => undefined);
  },

  /** Moves a set of assets into a different batch/sub-batch in one call. */
  async moveAssetsBulk(assetIds: string[], targetBatchNodeId: string): Promise<void> {
    const batchId = targetBatchNodeId.startsWith("b-") ? targetBatchNodeId.slice(2) : targetBatchNodeId;
    await apiClient.patch("/uploads/move-bulk", {
      uploadIds: assetIds.map(Number),
      batchId: Number(batchId),
    });
  },

  /** Soft-deletes (moves to Trash) a set of assets — there's no bulk-delete endpoint, so this
   *  fires one DELETE per id in parallel. */
  async deleteAssetsBulk(assetIds: string[]): Promise<void> {
    await Promise.all(assetIds.map((id) => apiClient.delete(`/uploads/${encodeURIComponent(id)}`)));
  },
};
