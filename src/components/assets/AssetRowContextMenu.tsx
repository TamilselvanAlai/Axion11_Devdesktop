import { useState } from "react";
import { toast } from "sonner";
import { FolderOpen, Download, Eye, Pencil, File as FileIcon } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AssetPreviewModal } from "@/components/assets/AssetPreviewModal";
import { assetService } from "@/services/asset.service";
import { localSyncService } from "@/services/localSync.service";
import { assetEditSessionService } from "@/services/assetEditSession.service";
import { buildAssetRelativePath, findAncestorPath, versionFolderName } from "@/utils/assetPath";
import { isUrl } from "@/utils/helpers";
import { canRenameAsset } from "@/utils/permissions";
import { useAssetStore, useMountSettingsStore } from "@/store";
import { useUser } from "@/hooks/useUser";
import type { Asset } from "@/types";

export function AssetRowContextMenu({ asset, children }: { asset: Asset; children: React.ReactNode }) {
  const user = useUser();
  const projectTree = useAssetStore((s) => s.projectTree);
  const mountPoint = useMountSettingsStore((s) => s.mountPoint);
  const setOpenEditingAssetId = useAssetStore((s) => s.setOpenEditingAssetId);
  const bumpLocalSyncTick = useAssetStore((s) => s.bumpLocalSyncTick);
  const refetchAssets = useAssetStore((s) => s.refetchAssets);
  const isTauri = localSyncService.isTauri();
  const previewableUrl = isUrl(asset.thumbnailColor) ? asset.thumbnailColor : null;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(asset.name);
  const [renaming, setRenaming] = useState(false);

  async function handleOpen() {
    if (!asset.downloadUrl) {
      toast.error("No file available to open.");
      return;
    }
    if (!isTauri) {
      window.open(asset.downloadUrl, "_blank");
      assetService.recordDownload(asset.id);
      return;
    }
    if (!asset.batchId) {
      toast.error("This asset isn't linked to a batch, so changes can't be synced back.");
      return;
    }
    const relativePath = buildAssetRelativePath(projectTree, asset.batchId, asset.name);
    if (relativePath === null) {
      toast.error("Project data is still loading — try again in a moment.");
      return;
    }
    try {
      await localSyncService.openAndSync({
        downloadUrl: asset.downloadUrl,
        relativePath,
        assetId: asset.id,
        batchId: asset.batchId.startsWith("b-") ? asset.batchId.slice(2) : asset.batchId,
        mountRoot: mountPoint,
      });
      assetService.recordDownload(asset.id);
      assetEditSessionService.start(asset.id).catch(() => undefined);
      setOpenEditingAssetId(asset.id);
      bumpLocalSyncTick();
      toast.success("Opened — saving the file will sync a new version automatically.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open file.");
    }
  }

  async function handleDownload() {
    if (!asset.downloadUrl) {
      toast.error("No file available to download.");
      return;
    }
    // Mirrors AssetDownloadDialog's layout: project-tree path + a Source/Draft/Final subfolder
    // (by version) so this lands in the exact same place a dialog-driven download would.
    const ancestors = (asset.batchId && findAncestorPath(projectTree, asset.batchId)) || [];
    const relativePath = [...ancestors, versionFolderName(asset), asset.name].join("/");
    try {
      const savedPath = await localSyncService.downloadToMount(asset.downloadUrl, relativePath, mountPoint);
      assetService.recordDownload(asset.id);
      toast.success(savedPath ? `Saved ${asset.name} to ${savedPath}` : `Downloaded ${asset.name}`, {
        closeButton: true,
        action: savedPath
          ? { label: <FileIcon className="size-4" />, onClick: () => localSyncService.revealInFileManager(savedPath) }
          : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to download ${asset.name}.`);
    }
  }

  function handlePreview() {
    if (!previewableUrl) {
      toast.error("No previewable image available for this file.");
      return;
    }
    setPreviewOpen(true);
  }

  function handleRenameOpen() {
    setRenameValue(asset.name);
    setRenameOpen(true);
  }

  async function handleRenameSubmit() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === asset.name) {
      setRenameOpen(false);
      return;
    }
    setRenaming(true);
    try {
      await assetService.renameAsset(asset.id, trimmed);
      toast.success("File renamed.");
      setRenameOpen(false);
      refetchAssets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename file.");
    } finally {
      setRenaming(false);
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={handleOpen} disabled={!asset.downloadUrl}>
            <FolderOpen /> Open
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleDownload} disabled={!asset.downloadUrl}>
            <Download /> Download
          </ContextMenuItem>
          <ContextMenuItem onSelect={handlePreview} disabled={!previewableUrl}>
            <Eye /> Preview
          </ContextMenuItem>
          {canRenameAsset(user) && (
            <ContextMenuItem onSelect={handleRenameOpen}>
              <Pencil /> Rename
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {previewOpen && previewableUrl && (
        <AssetPreviewModal imageUrl={previewableUrl} filename={asset.name} onClose={() => setPreviewOpen(false)} />
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={renaming}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={renaming || !renameValue.trim()}>
              {renaming ? "Renaming…" : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
