import type { Asset, AssetAssignee, AssetFileType } from "@/types";

const EXTENSION_MAP: Record<string, AssetFileType> = {
  tif: "TIFF",
  tiff: "TIFF",
  psd: "PSD",
  cr3: "CR3",
  jpg: "JPG",
  jpeg: "JPG",
  png: "PNG",
  webp: "WEBP",
  mp4: "MP4",
  mov: "MP4",
  zip: "ZIP",
};

const THUMBNAIL_COLORS = ["amber", "rose", "slate", "pink", "neutral", "emerald", "stone", "blue", "violet"];

function inferFileType(filename: string): AssetFileType {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MAP[extension] ?? "OTHER";
}

function stripExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

export function createAssetsFromFiles(files: FileList | File[], projectId: string, assignee: AssetAssignee): Asset[] {
  const now = new Date().toISOString();

  return Array.from(files).map((file, index) => {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    const name = stripExtension(relativePath || file.name);

    return {
      id: `upload_${Date.now()}_${index}`,
      projectId,
      batchId: projectId.startsWith("b-") ? projectId : null,
      name,
      status: "draft",
      fileType: inferFileType(file.name),
      sizeMb: Math.max(1, Math.round((file.size / (1024 * 1024)) * 10) / 10),
      version: "v1",
      assignee,
      updatedAt: now,
      thumbnailColor: THUMBNAIL_COLORS[index % THUMBNAIL_COLORS.length],
      established: false,
    };
  });
}
