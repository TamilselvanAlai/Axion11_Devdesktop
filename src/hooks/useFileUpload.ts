import { toast } from "sonner";
import { assetService } from "@/services/asset.service";
import { useAssetStore } from "@/store";
import type { DroppedContents, DroppedFolder, UploadTarget } from "@/utils/dragDropFiles";
import { confirmZipUpload } from "@/utils/confirmZipUpload";
import { batchNameFromZip, extractZipToFiles } from "@/utils/zipUpload";

/** How often to re-check a batch's processing status, and how long to keep trying before
 *  giving up — tighter than the website's 5s loop since polling here is cheap (no UI list to
 *  re-render at that cadence on a slower connection) and a quicker cadence is what makes the
 *  update feel immediate instead of laggy. */
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 600000;

export function useFileUpload() {
  const refetchAssets = useAssetStore((s) => s.refetchAssets);
  const refetchProjectTree = useAssetStore((s) => s.refetchProjectTree);
  const setUploadingBatch = useAssetStore((s) => s.setUploadingBatch);

  /** Batch uploads finish processing (thumbnails, AI tagging) on a background thread — the
   *  upload request resolving only means it was accepted, not that the rows/previews exist
   *  yet. Poll the batch's status and refresh the currently-displayed list on every tick, so
   *  assets appear as they finish instead of relying on a single fixed guess-delay. Also clears
   *  the "Processing…" indicator (see setUploadingBatch) once done, however it ends. */
  async function pollBatchUntilComplete(batchId: string) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    try {
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        let status: string | null;
        try {
          status = await assetService.getBatchUploadStatus(batchId);
        } catch {
          return; // batch likely gone (e.g. deleted mid-upload) — stop quietly
        }
        refetchAssets();
        if (status === "COMPLETED") {
          refetchProjectTree();
          return;
        }
      }
    } finally {
      setUploadingBatch(batchId, null);
    }
  }

  async function uploadFiles(files: File[], target: UploadTarget) {
    if (files.length === 0) return;
    const label = `${files.length} file${files.length === 1 ? "" : "s"}`;
    const toastId = toast.loading(`Uploading ${label}…`);
    const fileNames = files.map((f) => f.name);
    if (target.type === "batch") setUploadingBatch(target.id, { total: files.length, phase: "uploading", fileNames });
    try {
      await assetService.uploadFiles(files, target);
      toast.success(`Uploaded ${label}`, { id: toastId });
      refetchAssets();
      if (target.type === "batch") {
        setUploadingBatch(target.id, { total: files.length, phase: "processing", fileNames });
        pollBatchUntilComplete(target.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.", { id: toastId });
      if (target.type === "batch") setUploadingBatch(target.id, null);
    }
  }

  /** A dropped/selected folder becomes a new sub-batch named after it, nested under `target`. */
  async function uploadFolder(folder: DroppedFolder, target: UploadTarget) {
    if (folder.files.length === 0) return;
    const toastId = toast.loading(`Creating "${folder.name}" (${folder.files.length} files)…`);
    try {
      const batch = await assetService.createBatchWithFiles(folder.name, folder.files, target);
      const newBatchId = `b-${batch.id}`;
      toast.success(`Created "${folder.name}"`, { id: toastId });
      setUploadingBatch(newBatchId, { total: folder.files.length, phase: "processing", fileNames: folder.files.map((f) => f.name) });
      await refetchProjectTree();
      refetchAssets();
      pollBatchUntilComplete(newBatchId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to create "${folder.name}".`, { id: toastId });
    }
  }

  async function uploadDroppedContents(contents: DroppedContents, target: UploadTarget) {
    let looseFiles = contents.looseFiles;
    let folders = contents.folders;

    if (contents.zips.length > 0) {
      const choice = await confirmZipUpload(contents.zips.map((z) => z.name));
      if (choice === "zip") {
        looseFiles = [...looseFiles, ...contents.zips];
      } else if (choice === "extract") {
        for (const zip of contents.zips) {
          try {
            const files = await extractZipToFiles(zip);
            folders = [...folders, { name: batchNameFromZip(zip), files }];
          } catch (err) {
            toast.error(err instanceof Error ? err.message : `Failed to read "${zip.name}".`);
          }
        }
      }
      // choice === null (dismissed without picking): drop the zips, upload nothing for them.
    }

    const jobs: Promise<void>[] = [];
    if (looseFiles.length > 0) jobs.push(uploadFiles(looseFiles, target));
    for (const folder of folders) jobs.push(uploadFolder(folder, target));
    await Promise.all(jobs);
  }

  return { uploadFiles, uploadFolder, uploadDroppedContents };
}
