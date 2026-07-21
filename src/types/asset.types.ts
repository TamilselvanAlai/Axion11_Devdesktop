export type AssetStatus = "draft" | "approved" | "rejected" | "live";

export type AssetFileType = "TIFF" | "PSD" | "CR3" | "JPG" | "PNG" | "WEBP" | "MP4" | "ZIP" | "OTHER";

export interface AssetAssignee {
  name: string;
  initials: string;
}

export interface Asset {
  id: string;
  projectId: string;
  /** Tree-node-compatible id of the batch this asset lives in (e.g. "b-12"), for navigation. */
  batchId: string | null;
  name: string;
  status: AssetStatus;
  fileType: AssetFileType;
  sizeMb: number;
  version: string;
  assignee: AssetAssignee;
  updatedAt: string;
  thumbnailColor: string;
  /** True for the one version in this asset's chain that's the current "VE" (established) —
   *  the latest version an editor actually edited and saved, i.e. the original-format
   *  (TIFF/PSD, layered) source to rework from. Independent of approval status. */
  established: boolean;
}

export interface ProjectNode {
  id: string;
  name: string;
  children?: ProjectNode[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  assetCount: number;
  dueDate: string;
}

export interface AssetDetail extends Asset {
  filename: string;
  sku: string;
  batch: string;
  etaAt: string;
  modifiedAt: string;
  checksumOk: boolean;
  locked: boolean;
  /** Full-resolution original file, for opening/editing — distinct from the small preview used elsewhere. */
  downloadUrl: string | null;
}

export interface AssetComment {
  id: string;
  assetId: string;
  author: AssetAssignee;
  message: string;
  createdAt: string;
  /** Baked-strokes PNG (transparent bg) for the marked area, if this comment was posted with
   *  a pen-tool annotation — overlays exactly on top of the base image when the comment is clicked. */
  annotationImageUrl: string | null;
}

export type AssetViewMode = "list" | "grid";

export type AssetSortKey = "name" | "status" | "fileType" | "sizeMb" | "version" | "assignee" | "updatedAt";

export interface AssetFilters {
  status: AssetStatus | null;
  fileType: AssetFileType | null;
  batchId: string | null;
  assigneeName: string | null;
}

export type AssetScope = "all" | "recent" | "transfers" | { projectId: string };

// ── Raw shapes returned by the Spring Boot backend ──────────────────────────

export interface ImageTagApiDto {
  category: string;
  value: string;
  confidence: number;
}

export interface ImageUploadApiDto {
  id: number;
  fileName: string;
  publicUrl: string;
  contentType: string | null;
  fileSize: number | null;
  projectId: number | null;
  batchId: number | null;
  uploadedBy: string | null;
  createdAt: string | null;
  tags: ImageTagApiDto[];
  width: number | null;
  height: number | null;
  colorSpace: string | null;
  dpiX: number | null;
  dpiY: number | null;
  imageQualityQcCheck: string | null;
  imageTitle: string | null;
  altText: string | null;
  description: string | null;
  previewUrl: string | null;
  versionNumber: number | null;
  originalUploadId: number | null;
  assignedToUserId: number | null;
  assignedToName: string | null;
  approvalStatus: string | null;
  established: boolean;
}

export interface ProjectTreeApiNode {
  id: string;
  name: string;
  type: "project" | "batch" | "asset";
  status: string | null;
  children: ProjectTreeApiNode[] | null;
  projectId: string | null;
  uploadStatus: string | null;
  totalAssets: number | null;
  dueDate: string | null;
  assignedTo: string | null;
  createdAt: string | null;
}

export interface CommentApiDto {
  id: number;
  text: string;
  authorName: string;
  createdAt: string;
  resolved: boolean;
  annotationImageUrl?: string | null;
}

/** Response of POST /assets/{id}/comments — the whole asset detail, comments list included. */
export interface AssetDetailWithCommentsApiDto {
  comments?: CommentApiDto[] | null;
}

export interface BatchApiDto {
  id: number;
  name: string;
  projectId: number | null;
  projectName: string | null;
  parentBatchId: number | null;
  status: string | null;
  uploadStatus: string | null;
  totalImages: number | null;
  uploadedImages: number | null;
  assignedTo: string | null;
  dueDate: string | null;
  priority: string | null;
  createdAt: string | null;
}

export interface BatchWithUploadsApiDto extends BatchApiDto {
  imageUploads: ImageUploadApiDto[] | null;
}
