import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cloudSyncService, PROVIDER_LABEL } from "@/services/cloudSync.service";
import { googleDriveService } from "@/services/googleDrive.service";
import { cloudConnectionService, OAUTH_BACKED_PROVIDERS } from "@/services/cloudConnection.service";
import { useCloudSyncStore } from "@/store";
import type { CloudProvider } from "@/types";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}

export function useCloudSync() {
  const { status, account, lastSyncedAt, fileCount, error, setStatus, setConnected, setSynced, setError, reset } =
    useCloudSyncStore();
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
        let fileCount: number;

        if (account?.provider === "google-drive" && googleDriveService.isTauri()) {
          fileCount = (await googleDriveService.listFiles()).length;
        } else if (account && OAUTH_BACKED_PROVIDERS.includes(account.provider)) {
          const items = await cloudConnectionService.browse(account.provider);
          fileCount = items.filter((item) => !item.isFolder).length;
        } else {
          fileCount = (await cloudSyncService.fetchRemoteFiles()).length;
        }

        setSynced(fileCount);
        toast.success(`Synced ${fileCount} files from ${account ? PROVIDER_LABEL[account.provider] : "cloud"}`);
        if (navigateOnSuccess) navigate("/projects");
      } catch (err) {
        const message = errorMessage(err, "Sync failed. Please try again.");
        setError(message);
        toast.error(message);
      }
    },
    [account, navigate, setError, setStatus, setSynced]
  );

  const connect = useCallback(
    async (provider: CloudProvider) => {
      setStatus("connecting");
      try {
        if (provider === "google-drive" && googleDriveService.isTauri()) {
          const nextAccount = { provider, ...(await googleDriveService.login()) };
          setConnected(nextAccount);
          toast.success(`Connected to ${PROVIDER_LABEL[provider]}`);
          await sync({ navigateOnSuccess: true });
          return;
        }

        if (OAUTH_BACKED_PROVIDERS.includes(provider)) {
          // Popup + postMessage is unreliable against Google's OAuth pages (they sever the
          // window.opener link via cross-origin isolation), so use a plain full-page redirect
          // instead — OAuthCallbackPage completes the exchange once Google sends us back.
          const { authUrl, configured, error } = await cloudConnectionService.getAuthUrl(provider);
          if (!configured || !authUrl) {
            throw new Error(error ?? `${PROVIDER_LABEL[provider]} isn't configured on the server yet.`);
          }
          window.location.href = authUrl;
          return;
        }

        const nextAccount = await cloudSyncService.connect(provider);
        setConnected(nextAccount);
        toast.success(`Connected to ${PROVIDER_LABEL[provider]}`);
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
    if (account?.provider === "google-drive" && googleDriveService.isTauri()) {
      googleDriveService.logout().catch(() => undefined);
    } else if (account && OAUTH_BACKED_PROVIDERS.includes(account.provider)) {
      cloudConnectionService.disconnect(account.provider).catch(() => undefined);
    }
    reset();
    toast.info("Cloud drive disconnected");
  }, [account, reset]);

  return { status, account, lastSyncedAt, fileCount, error, connect, sync, disconnect };
}
