import { toast } from "sonner";
import { assetService } from "@/services/asset.service";
import { subscribeToBatchStatus } from "@/services/batchEvents";
import { useAssetStore } from "@/store";
import type { DroppedContents, DroppedFolder, UploadTarget } from "@/utils/dragDropFiles";
import { confirmZipUpload } from "@/utils/confirmZipUpload";
import { batchNameFromZip, extractZipToFiles } from "@/utils/zipUpload";

/** Fallback cadence/timeout used only when the SSE status stream (see batchEvents.ts) is
 *  unavailable — a proxy/firewall that buffers text/event-stream, or the connection dropping
 *  mid-batch. The normal path doesn't poll at all: the backend pushes a status event the instant
 *  it changes. */
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 600000;

export function useFileUpload() {
  const refetchAssets = useAssetStore((s) => s.refetchAssets);
  const refetchProjectTree = useAssetStore((s) => s.refetchProjectTree);
  const setUploadingBatch = useAssetStore((s) => s.setUploadingBatch);

  /** Batch uploads finish processing (thumbnails, AI tagging) on a background thread — the
   *  upload request resolving only means it was accepted, not that the rows/previews exist yet.
   *  Subscribes to the batch's SSE status stream and refreshes the currently-displayed list the
   *  instant a status change arrives, so assets appear as they finish instead of on a delay.
   *  Falls back to the old fixed-interval poll only if push turns out to be unavailable (see
   *  batchEvents.ts) — e.g. a network that buffers/blocks text/event-stream. Also clears the
   *  "Processing…" indicator (see setUploadingBatch) once done, however it ends. */
  async function pollBatchUntilComplete(batchId: string) {
    // The upload this is chained after (see uploadFiles/uploadFolder below) is fully awaited
    // before this runs — for a fast, small upload the server can already have flipped the batch
    // to COMPLETED and published its one-shot SSE event before we ever subscribe. publishStatus
    // only reaches emitters connected *at that moment*; a subscription that opens after the fact
    // waits for an event that already happened and isn't coming again, hanging until the deadline
    // below. Checking the already-current status up front closes that race without changing when
    // the upload itself happens.
    try {
      const alreadyDone = await assetService.getBatchUploadStatus(batchId);
      if (alreadyDone === "COMPLETED" || alreadyDone === "FAILED") {
        refetchAssets();
        if (alreadyDone === "COMPLETED") refetchProjectTree();
        setUploadingBatch(batchId, null);
        return;
      }
    } catch {
      // batch likely gone — fall through to the normal flow below, which handles this too
    }

    const deadline = Date.now() + POLL_TIMEOUT_MS;

    async function pollFallback() {
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
        if (status === "FAILED") return;
      }
    }

    try {
      await new Promise<void>((resolve) => {
        const unsubscribe = subscribeToBatchStatus(
          batchId,
          (status) => {
            refetchAssets();
            if (status === "COMPLETED") {
              refetchProjectTree();
              resolve();
            } else if (status === "FAILED") {
              resolve();
            }
          },
          () => {
            pollFallback().finally(resolve);
          }
        );
        // Belt-and-suspenders: if neither the stream nor the fallback poll ever resolves
        // (batch stuck, server issue), stop showing "Processing…" once the deadline passes.
        setTimeout(() => {
          unsubscribe();
          resolve();
        }, Math.max(deadline - Date.now(), 0));
      });
    } finally {
      setUploadingBatch(batchId, null);
    }
  }

  async function uploadFiles(files: File[], target: UploadTarget) {
    if (files.length === 0) return;
    const total = files.length;
    const assetWord = (n: number) => (n === 1 ? "asset" : "assets");
    const toastId = toast.loading(`Uploading files… 0 of ${total} completed (0%)`);
    const fileNames = files.map((f) => f.name);
    if (target.type === "batch") setUploadingBatch(target.id, { total, phase: "uploading", fileNames });
    try {
      const result = await assetService.uploadFiles(files, target, (completed, totalCount) => {
        const pct = Math.round((completed / totalCount) * 100);
        toast.loading(`Uploading files… ${completed} of ${totalCount} completed (${pct}%)`, { id: toastId });
      });
      refetchAssets();

      if (result.failed.length === 0) {
        toast.success(`${total} ${assetWord(total)} uploaded successfully`, { id: toastId });
      } else {
        const retry = { label: "Retry", onClick: () => uploadFiles(result.failed.map((f) => f.file), target) };
        if (result.succeeded === 0) {
          toast.error(`Failed to upload ${result.failed.length} ${assetWord(result.failed.length)}.`, { id: toastId, action: retry });
        } else {
          toast.warning(`Uploaded ${result.succeeded} of ${total} ${assetWord(total)} · ${result.failed.length} failed`, {
            id: toastId,
            action: retry,
          });
        }
      }

      if (target.type === "batch" && result.succeeded > 0) {
        setUploadingBatch(target.id, { total, phase: "processing", fileNames });
        pollBatchUntilComplete(target.id);
      } else if (target.type === "batch") {
        setUploadingBatch(target.id, null);
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
