export type AssetStatus = "approved" | "pending" | "in-review" | "rejected" | "processing";

export type AssetFileType = "TIFF" | "PSD" | "CR3" | "JPG" | "PNG" | "MP4" | "ZIP" | "OTHER";

export interface AssetAssignee {
  name: string;
  initials: string;
}

export interface Asset {
  id: string;
  projectId: string;
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
