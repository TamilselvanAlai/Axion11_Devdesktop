import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cloudSyncService, PROVIDER_LABEL } from "@/services/cloudSync.service";
import { googleDriveService } from "@/services/googleDrive.service";
import { assetService } from "@/services/asset.service";
import { useCloudSyncStore, useAssetStore } from "@/store";
import type { CloudProvider } from "@/types";
import { ROUTES } from "@/constants/routes";
import { getInitials } from "@/utils/formatters";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}

export function useCloudSync() {
  const { status, account, lastSyncedAt, fileCount, error, setStatus, setConnected, setSynced, setError, reset } =
    useCloudSyncStore();
  const setProjectTree = useAssetStore((state) => state.setProjectTree);
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "connecting" || status === "syncing") {
      setStatus(account ? "connected" : "disconnected");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = useCallback(
    async ({ navigateOnSuccess = false }: { navigateOnSuccess?: boolean } = {}) => {
      setStatus("syncing");
      try {
        const assigneeName = account?.email.split("@")[0] ?? "Cloud Sync";
        const assigneeInitials = getInitials(assigneeName);

        const files =
          account?.provider === "google-drive"
            ? (await googleDriveService.listFiles()).map((file) => ({
                id: `gdrive_${file.id}`,
                name: file.name,
                fileType: cloudSyncService.mimeTypeToFileType(file.mimeType),
                sizeMb: file.sizeMb,
              }))
            : await cloudSyncService.fetchRemoteFiles();

        const created = await assetService.ingestCloudAssets({ assigneeName, assigneeInitials, files });
        setProjectTree(await assetService.getProjectTree());
        setSynced(created.length);
        toast.success(`Synced ${created.length} files into Cloud Drive`);
        if (navigateOnSuccess) navigate(`${ROUTES.projects}/cloud-drive`);
      } catch (err) {
        const message = errorMessage(err, "Sync failed. Please try again.");
        setError(message);
        toast.error(message);
      }
    },
    [account, navigate, setError, setProjectTree, setStatus, setSynced]
  );

  const connect = useCallback(
    async (provider: CloudProvider) => {
      setStatus("connecting");
      try {
        const nextAccount =
          provider === "google-drive"
            ? { provider, ...(await googleDriveService.login()) }
            : await cloudSyncService.connect(provider);
        setConnected(nextAccount);
        toast.success(`Connected to ${PROVIDER_LABEL[provider]} as ${nextAccount.email}`);
        await sync({ navigateOnSuccess: true });
      } catch (err) {
        const message = errorMessage(err, "Could not connect. Please try again.");
        setError(message);
        toast.error(message);
      }
    },
    [setConnected, setError, setStatus, sync]
  );

  const disconnect = useCallback(() => {
    if (account?.provider === "google-drive") {
      googleDriveService.logout().catch(() => undefined);
    }
    reset();
    toast.info("Cloud drive disconnected");
  }, [account, reset]);

  return { status, account, lastSyncedAt, fileCount, error, connect, sync, disconnect };
}
