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
  AuditLogApiDto,
  ImageUploadApiDto,
  ProjectApiDto,
  ProjectNode,
  ProjectSummary,
  ProjectTreeApiNode,
} from "@/types";
import { isAxiosError } from "axios";
import { apiClient } from "@/services/api.service";
import { getInitials } from "@/utils/formatters";

// ── Converters ───────────────────────────────────────────────────────────

function mimeToFileType(mime: string | null, fileName?: string | null): AssetFileType {
  const m = (mime ?? "").toLowerCase();
  if (m.includes("photoshop") || m.includes("psd")) return "PSD";
  if (m === "image/tiff" || m.includes("tiff")) return "TIFF";
  if (m.includes("cr3")) return "CR3";
  if (m.includes("heic") || m.includes("heif")) return "HEIC";
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
    case "cr2":          return "CR2";
    case "cr3":          return "CR3";
    case "crw":          return "CRW";
    case "arw":          return "ARW";
    case "srf":          return "SRF";
    case "sr2":          return "SR2";
    case "dng":          return "DNG";
    case "raf":          return "RAF";
    case "3fr":          return "3FR";
    case "fff":          return "FFF";
    case "nef":          return "NEF";
    case "nrw":          return "NRW";
    case "orf":          return "ORF";
    case "rw2":          return "RW2";
    case "rwl":          return "RWL";
    case "pef":          return "PEF";
    case "ptx":          return "PTX";
    case "srw":          return "SRW";
    case "x3f":          return "X3F";
    case "iiq":          return "IIQ";
    case "mef":          return "MEF";
    case "mos":          return "MOS";
    case "erf":          return "ERF";
    case "kdc":          return "KDC";
    case "dcr":          return "DCR";
    case "mrw":          return "MRW";
    case "gpr":          return "GPR";
    case "raw":          return "RAW";
    case "heic":
    case "heif":         return "HEIC";
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
  // The established row is always the chain's current working copy — it reads as "VE" for as
  // long as it's established, regardless of approval status (draft, approved, or rejected all
  // still show "VE"; see ImageUpload#established on the backend). It only turns into its real
  // v{n} once a same-name re-upload finalizes it (see ImageUploadService#findExistingSecondSlot),
  // which is also what clears the established flag.
  const version = dto.established ? "VE" : `v${dto.versionNumber ?? 1}`;
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
    // The other way around from thumbnailColor: an actual download should be the real file,
    // only falling back to the preview if the original genuinely isn't available.
    downloadUrl: dto.publicUrl || dto.previewUrl || null,
    established: dto.established,
  };
}

function toAssetDetail(dto: ImageUploadApiDto): AssetDetail {
  return {
    ...toAsset(dto),
    filename: dto.fileName,
    sku: dto.imageTitle ?? "—",
    batch: dto.batchName ?? (dto.batchId ? String(dto.batchId) : "—"),
    etaAt: dto.createdAt ?? "—",
    modifiedAt: dto.createdAt ?? "—",
    checksumOk: dto.imageQualityQcCheck === "PASSED",
    locked: false,
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
    resolved: dto.resolved,
    parentCommentId: dto.parentCommentId != null ? String(dto.parentCommentId) : null,
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

/** Uploads one file via a GCS signed URL (PUT straight to storage, bypassing the backend), then
 *  tells the backend about it via the small JSON /uploads/confirm call. Falls back to a direct
 *  multipart POST through the backend only if signed-URL generation or the GCS PUT itself fails
 *  (e.g. local dev without GCS service-account credentials) — that fallback is capped by Cloud
 *  Run's request-size limit, so it must never be the reaction to a /confirm hiccup after the
 *  file's bytes are already sitting safely in GCS; that's retried instead (see below). */
async function uploadOneFile(file: File, target: { batchId?: string; projectId?: string }): Promise<void> {
  const contentType = file.type || "application/octet-stream";

  const uploaded = await (async (): Promise<{ gcsFileName: string } | null> => {
    try {
      const { data: signed } = await apiClient.post<{ signedUrl?: string; gcsFileName?: string }>(
        "/uploads/signed-url",
        { fileName: file.name, contentType }
      );
      if (!signed.signedUrl || !signed.gcsFileName) return null;

      const putResponse = await fetch(signed.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!putResponse.ok) {
        throw new Error(`Upload to storage failed with status ${putResponse.status}`);
      }
      return { gcsFileName: signed.gcsFileName };
    } catch (err) {
      // A 400 here is the backend explicitly rejecting the file (e.g. unsupported type) — not
      // a "signed-URL flow unavailable" failure, so it must not fall back to the multipart
      // endpoint below: that would silently re-attempt (and for a batch upload, asynchronously
      // re-reject with no client-visible failure) a file the backend already refused.
      if (isAxiosError(err) && err.response?.status === 400) {
        throw new Error(typeof err.response.data === "string" ? err.response.data : "File rejected by server");
      }
      console.warn(`Signed-URL upload failed for "${file.name}", falling back to direct upload:`, err);
      return null;
    }
  })();

  if (uploaded) {
    const confirmBody = {
      gcsFileName: uploaded.gcsFileName,
      originalFileName: file.name,
      contentType,
      fileSize: file.size,
      projectId: target.projectId ? Number(target.projectId) : undefined,
      batchId: target.batchId ? Number(target.batchId) : undefined,
    };
    // The confirm call itself is small JSON, but the backend row-creation it waits on can
    // occasionally take a little longer than the default timeout under load, or hit a transient
    // failure. Retry it a few times rather than falling through to the multipart path below —
    // the file's bytes are already in GCS at this point, so re-uploading the whole thing again
    // through a size-capped endpoint would be both wasteful and exactly what breaks on anything
    // larger than Cloud Run's request limit.
    const CONFIRM_ATTEMPTS = 4;
    for (let attempt = 1; attempt <= CONFIRM_ATTEMPTS; attempt++) {
      try {
        await apiClient.post("/uploads/confirm", confirmBody, { timeout: 60000 });
        return;
      } catch (err) {
        if (attempt === CONFIRM_ATTEMPTS) {
          console.warn(`Confirming "${file.name}" failed after ${CONFIRM_ATTEMPTS} attempts:`, err);
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }

  const formData = new FormData();
  formData.append("files", file, file.name);
  if (target.batchId) {
    await apiClient.post(`/batches/upload/${encodeURIComponent(target.batchId)}`, formData, { timeout: 120000 });
  } else if (target.projectId) {
    formData.append("projectId", target.projectId);
    await apiClient.post("/uploads", formData, { timeout: 120000 });
  }
}

export interface UploadFilesResult {
  succeeded: number;
  failed: { file: File; error: unknown }[];
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
   *  confirms the request was accepted, not that the rows exist yet.
   *
   *  Each file goes up individually via a GCS signed URL rather than as raw bytes through the
   *  backend: Cloud Run hard-caps request bodies at ~32MB, and either one large PSD/TIFF master
   *  or several files bundled into a single multipart request can exceed that and fail with a
   *  413 (which surfaces to the browser as an opaque "Network Error" rather than a real status,
   *  since Cloud Run resets the connection before a response body is readable). Falls back to a
   *  direct multipart POST per file only if signed-URL generation itself is unavailable (e.g.
   *  local dev without GCS service-account credentials). */
  async uploadFiles(
    files: File[],
    target: { type: "project" | "batch"; id: string },
    /** Fired after each individual file finishes (succeeding or failing), so the caller (see
     *  useFileUpload's toast) can show live "N of M" progress instead of a static "Uploading N
     *  files…" for the whole batch's entire duration. */
    onProgress?: (completed: number, total: number) => void
  ): Promise<UploadFilesResult> {
    if (files.length === 0) return { succeeded: 0, failed: [] };

    const batchId = target.type === "batch" ? (target.id.startsWith("b-") ? target.id.slice(2) : target.id) : null;
    const projectId = target.type === "project" ? (target.id.startsWith("p-") ? target.id.slice(2) : target.id) : null;

    if (batchId) {
      await apiClient.post(`/batches/${encodeURIComponent(batchId)}/start-upload`, null, { params: { total: files.length } });
    }

    // One file failing (a bad file, a flaky connection) shouldn't abort the rest of the batch —
    // caught per-file so a 47/48 success still lands 47 rows instead of zero, with the 1 failure
    // surfaced back to the caller instead of silently losing which file(s) need a retry.
    let succeeded = 0;
    const failed: { file: File; error: unknown }[] = [];
    for (const file of files) {
      try {
        await uploadOneFile(file, batchId ? { batchId } : { projectId: projectId! });
        succeeded++;
      } catch (error) {
        failed.push({ file, error });
      }
      onProgress?.(succeeded + failed.length, files.length);
    }

    return { succeeded, failed };
  },

  /** Creates a brand-new batch (sub-folder) with the given files in one call — this is what a
   *  dropped OS folder maps to: the folder becomes a batch named after it, nested under
   *  wherever it was dropped, instead of its files being flattened into the drop target.
   *  Returns the created batch so the caller can poll its processing status. */
  async createBatchWithFiles(name: string, files: File[], target: { type: "project" | "batch"; id: string; rootProjectId: string }): Promise<BatchApiDto> {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("projectId", target.rootProjectId);
    if (target.type === "batch") {
      const parentBatchId = target.id.startsWith("b-") ? target.id.slice(2) : target.id;
      formData.append("parentBatchId", parentBatchId);
    }
    for (const file of files) formData.append("files", file, file.name);
    const { data } = await apiClient.post<BatchApiDto>("/batches", formData, { timeout: 180000 });
    return data;
  },

  /** Current processing status of a batch ("COMPLETED" once uploads finish server-side
   *  processing — thumbnailing, AI tagging, etc.) — used to poll after an upload is accepted,
   *  since the accept response doesn't mean the rows/previews exist yet. */
  async getBatchUploadStatus(batchId: string): Promise<string | null> {
    const numericId = batchId.startsWith("b-") ? batchId.slice(2) : batchId;
    const { data } = await apiClient.get<BatchApiDto>(`/batches/${numericId}`);
    return data.uploadStatus;
  },

  /** Top-level project metadata (name, owner, team, created date) — powers the project info
   *  panel when a top-level project row (not a batch) is single-clicked; see getBatchDetail for
   *  the batch equivalent. */
  async getProject(projectNodeId: string): Promise<ProjectApiDto> {
    const numericId = projectNodeId.startsWith("p-") ? projectNodeId.slice(2) : projectNodeId;
    const { data } = await apiClient.get<ProjectApiDto>(`/projects/${numericId}`);
    return data;
  },

  /** Full batch detail plus every one of its uploads (every version, not just latest) — powers
   *  the folder/batch info panel (name, project, assignee, due date, priority, workflow status)
   *  and lets the panel compute approved/pending/rejected counts client-side the same way
   *  toAssetStatus does for a single asset. */
  async getBatchDetail(batchNodeId: string): Promise<BatchWithUploadsApiDto> {
    const numericId = batchNodeId.startsWith("b-") ? batchNodeId.slice(2) : batchNodeId;
    const { data } = await apiClient.get<BatchWithUploadsApiDto>(`/batches/${numericId}`);
    return data;
  },

  /** Takes the already-resolved tree node (not just its id) so the batch case can read its
   *  root project id straight off the tree — the tree already carries it (see ProjectNode.
   *  projectId) — instead of an extra `GET /batches/{id}` round trip before this folder's
   *  contents can even start loading. */
  async getFolderSummary(node: ProjectNode): Promise<ProjectSummary[]> {
    // Tree node ids are prefixed ("p-1" for projects, "b-5" for batches/folders) —
    // the backend only accepts a raw numeric projectId, so resolve accordingly.
    let numericProjectId: number;
    let parentBatchId: number | null;

    if (node.id.startsWith("b-")) {
      const batchId = Number(node.id.slice(2));
      numericProjectId = node.projectId ? Number(node.projectId.slice(2)) : batchId;
      parentBatchId = batchId;
    } else {
      numericProjectId = Number(node.id.startsWith("p-") ? node.id.slice(2) : node.id);
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

  /** Every version of every asset under one or more folder-list tree nodes — used by the bulk
   *  "Download" action on the folder list (see ProjectFolderTable), where each selected row can
   *  itself be a leaf batch (uploads live directly on it) or a folder of sub-batches. Descends
   *  the already-loaded project tree to find every leaf batch under each selected node, then
   *  pulls that batch's full upload history (every version, not just the latest — unlike
   *  listAssets/getBatch's table-view path, this needs v1/VE/vN to sort into Source/Draft/Final). */
  async getAllAssetsInFolders(folderNodeIds: string[], projectTree: ProjectNode[]): Promise<Asset[]> {
    const targetIds = new Set(folderNodeIds);
    const leafBatchIds = new Set<string>();

    function collectLeaves(node: ProjectNode) {
      if (!node.children || node.children.length === 0) {
        if (node.type === "batch") leafBatchIds.add(node.id);
        return;
      }
      for (const child of node.children) collectLeaves(child);
    }

    function walk(nodes: ProjectNode[]) {
      for (const node of nodes) {
        if (targetIds.has(node.id)) {
          collectLeaves(node);
        } else if (node.children?.length) {
          walk(node.children);
        }
      }
    }
    walk(projectTree);

    const perBatch = await Promise.all(
      Array.from(leafBatchIds).map(async (nodeId) => {
        const batchId = nodeId.slice(2);
        const { data } = await apiClient.get<BatchWithUploadsApiDto>(`/batches/${batchId}`);
        return (data.imageUploads ?? []).map(toAsset);
      })
    );
    return perBatch.flat();
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

  /** Reverses an approval decision, landing on "revoked" — backend rejects this unless the
   *  asset is currently "approved" (not yet "live"). */
  async revokeApproval(assetId: string): Promise<void> {
    await apiClient.post(`/assets/${encodeURIComponent(assetId)}/revoke-approval`);
  },

  async getComments(assetId: string): Promise<AssetComment[]> {
    const { data } = await apiClient.get<CommentApiDto[]>(
      `/uploads/${encodeURIComponent(assetId)}/comments`
    );
    return data.map((c) => toAssetComment(c, assetId));
  },

  /** Posts a comment, optionally with a pen-tool annotation baked into a transparent PNG
   *  (image) plus its mark center (x/y, natural-image pixels), and optionally as a reply to
   *  another comment (parentCommentId). Returns the asset's full, now-current comment list —
   *  the annotation-capable endpoint replies with the whole asset detail rather than just the
   *  new comment. */
  async addComment(
    assetId: string,
    message: string,
    annotation?: { image: string; x: number; y: number },
    parentCommentId?: string
  ): Promise<AssetComment[]> {
    const { data } = await apiClient.post<AssetDetailWithCommentsApiDto>(
      `/assets/${encodeURIComponent(assetId)}/comments`,
      {
        text: message,
        annotationImage: annotation?.image,
        markX: annotation?.x,
        markY: annotation?.y,
        parentCommentId: parentCommentId ? Number(parentCommentId) : undefined,
      }
    );
    return (data.comments ?? []).map((c) => toAssetComment(c, assetId));
  },

  /** Edits an existing comment's text in place. */
  async editComment(commentId: string, text: string): Promise<void> {
    await apiClient.put(`/assets/comments/${encodeURIComponent(commentId)}`, { text });
  },

  /** Toggles a comment's (or reply's) "Done" checkmark. */
  async setCommentResolved(commentId: string, resolved: boolean): Promise<void> {
    await apiClient.patch(`/assets/comments/${encodeURIComponent(commentId)}/resolve`, { resolved });
  },

  /** Deletes a comment. There's no author-only restriction on the backend (matches the web
   *  app's behavior — any authenticated user with asset access can delete any comment). */
  async deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(`/assets/comments/${encodeURIComponent(commentId)}`);
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

  /** Real per-asset History — who/when uploaded, edited, commented, approved/rejected, most
   *  recent first. `assetId` is any version's id (the backend resolves it directly, no chain
   *  walk needed since AuditLog rows are written against a specific version's row id). */
  async getAssetHistory(assetId: string): Promise<AuditLogApiDto[]> {
    const { data } = await apiClient.get<AuditLogApiDto[]>(`/audit/asset/${encodeURIComponent(assetId)}`);
    return data;
  },

  /** Real per-batch History — every event logged against any asset in this batch. */
  async getBatchHistory(batchNodeId: string): Promise<AuditLogApiDto[]> {
    const numericId = batchNodeId.startsWith("b-") ? batchNodeId.slice(2) : batchNodeId;
    const { data } = await apiClient.get<AuditLogApiDto[]>(`/audit/batch/${numericId}`);
    return data;
  },

  /** Real per-project History — every event logged anywhere under this project. */
  async getProjectHistory(projectNodeId: string): Promise<AuditLogApiDto[]> {
    const numericId = projectNodeId.startsWith("p-") ? projectNodeId.slice(2) : projectNodeId;
    const { data } = await apiClient.get<AuditLogApiDto[]>(`/audit/project/${numericId}`);
    return data;
  },

  /** Renames a single asset's file name. Reuses the batch-rename endpoint (shared with the web
   *  app) with a single-entry payload — there is no dedicated single-file rename route. */
  async renameAsset(assetId: string, newFileName: string): Promise<void> {
    await apiClient.post("/uploads/batch-rename", [{ id: Number(assetId), newFileName }]);
  },
};
