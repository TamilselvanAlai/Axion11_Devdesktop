export type AssetStatus = "approved" | "pending" | "in-review" | "rejected" | "processing";

export type AssetFileType = "TIFF" | "PSD" | "CR3" | "JPG" | "PNG" | "MP4" | "ZIP" | "OTHER";

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
}

export interface AssetComment {
  id: string;
  assetId: string;
  author: AssetAssignee;
  message: string;
  createdAt: string;
}

export type AssetViewMode = "list" | "grid";

export type AssetSortKey = "name" | "status" | "fileType" | "sizeMb" | "version" | "assignee" | "updatedAt";

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
