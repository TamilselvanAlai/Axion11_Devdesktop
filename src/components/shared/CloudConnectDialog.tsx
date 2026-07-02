import { useState } from "react";
import { Cloud, Box, HardDrive, Database, Loader2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PROVIDER_LABEL } from "@/services/cloudSync.service";
import { OAUTH_BACKED_PROVIDERS } from "@/services/cloudConnection.service";
import type { CloudProvider, CloudSyncStatus } from "@/types";

const PROVIDER_ICON: Record<CloudProvider, typeof Cloud> = {
  "google-drive": Cloud,
  dropbox: Box,
  onedrive: HardDrive,
  box: Database,
};

const PROVIDER_ACCENT: Record<CloudProvider, string> = {
  "google-drive": "bg-blue-500/10 text-blue-500",
  dropbox: "bg-indigo-500/10 text-indigo-500",
  onedrive: "bg-sky-500/10 text-sky-500",
  box: "bg-violet-500/10 text-violet-500",
};

const PROVIDERS: CloudProvider[] = ["google-drive", "dropbox", "onedrive", "box"];

interface CloudConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: CloudSyncStatus;
  onConnect: (provider: CloudProvider) => void;
}

export function CloudConnectDialog({ open, onOpenChange, status, onConnect }: CloudConnectDialogProps) {
  const [pendingProvider, setPendingProvider] = useState<CloudProvider | null>(null);
  const isConnecting = status === "connecting" || status === "syncing";

  function handleConnect(provider: CloudProvider) {
    setPendingProvider(provider);
    onConnect(provider);
  }

  const connectingCopy =
    pendingProvider && OAUTH_BACKED_PROVIDERS.includes(pendingProvider) && status === "connecting"
      ? "Redirecting to sign in…"
      : status === "connecting"
        ? `Connecting to ${pendingProvider ? PROVIDER_LABEL[pendingProvider] : "your drive"}…`
        : "Syncing files into Cloud Drive…";

  return (
    <Dialog open={open} onOpenChange={(next) => !isConnecting && onOpenChange(next)}>
      <DialogContent showCloseButton={!isConnecting}>
        <DialogHeader>
          <DialogTitle>Link a cloud drive</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Connect a storage provider to sync files directly into your workspace.
          </p>
        </DialogHeader>

        {isConnecting ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm font-medium">{connectingCopy}</p>
            <p className="text-xs text-muted-foreground">
              {pendingProvider && OAUTH_BACKED_PROVIDERS.includes(pendingProvider) && status === "connecting"
                ? "You'll be brought back here after approving access."
                : "This usually takes a few seconds."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="mb-1 flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2.5">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Google Drive and OneDrive redirect you to sign in and bring you back here. Dropbox and Box use mock
                data for now.
              </p>
            </div>
            {PROVIDERS.map((provider) => {
              const Icon = PROVIDER_ICON[provider];
              return (
                <button
                  key={provider}
                  type="button"
                  onClick={() => handleConnect(provider)}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted"
                >
                  <span className={`flex size-8 items-center justify-center rounded-lg ${PROVIDER_ACCENT[provider]}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="flex-1">{PROVIDER_LABEL[provider]}</span>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
