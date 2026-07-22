import { toast } from "sonner";
import { assetService } from "@/services/asset.service";
import { useAssetStore } from "@/store";
import type { DroppedFolder, UploadTarget } from "@/utils/dragDropFiles";

export function useFileUpload() {
  const refetchAssets = useAssetStore((s) => s.refetchAssets);
  const refetchProjectTree = useAssetStore((s) => s.refetchProjectTree);

  async function uploadFiles(files: File[], target: UploadTarget) {
    if (files.length === 0) return;
    const label = `${files.length} file${files.length === 1 ? "" : "s"}`;
    const toastId = toast.loading(`Uploading ${label}…`);
    try {
      await assetService.uploadFiles(files, target);
      toast.success(`Uploaded ${label}`, { id: toastId });
      refetchAssets();
      if (target.type === "batch") {
        // Batch uploads process on a background thread — the rows aren't there yet when the
        // request resolves, so poll once more after giving the server a moment to catch up.
        setTimeout(() => refetchAssets(), 4000);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.", { id: toastId });
    }
  }

  /** A dropped/selected folder becomes a new sub-batch named after it, nested under `target`. */
  async function uploadFolder(folder: DroppedFolder, target: UploadTarget) {
    if (folder.files.length === 0) return;
    const toastId = toast.loading(`Creating "${folder.name}" (${folder.files.length} files)…`);
    try {
      await assetService.createBatchWithFiles(folder.name, folder.files, target);
      toast.success(`Created "${folder.name}"`, { id: toastId });
      await refetchProjectTree();
      refetchAssets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to create "${folder.name}".`, { id: toastId });
    }
  }

  async function uploadDroppedContents(contents: { looseFiles: File[]; folders: DroppedFolder[] }, target: UploadTarget) {
    const jobs: Promise<void>[] = [];
    if (contents.looseFiles.length > 0) jobs.push(uploadFiles(contents.looseFiles, target));
    for (const folder of contents.folders) jobs.push(uploadFolder(folder, target));
    await Promise.all(jobs);
  }

  return { uploadFiles, uploadFolder, uploadDroppedContents };
}
