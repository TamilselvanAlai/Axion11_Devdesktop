import { useState } from "react";
import { RefreshCw, AlertTriangle, Cloud } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CloudConnectDialog } from "@/components/shared/CloudConnectDialog";
import { CloudFileBrowserDialog } from "@/components/assets/CloudFileBrowserDialog";
import { useCloudSync } from "@/hooks/useCloudSync";
import { PROVIDER_LABEL } from "@/services/cloudSync.service";
import { formatRelativeTime } from "@/utils/formatters";

export function CloudSyncMenu() {
  const { status, account, lastSyncedAt, fileCount, connect, sync, disconnect } = useCloudSync();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);

  if (status === "disconnected") {
    return (
      <>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <span className="size-1 rounded-full bg-muted-foreground" />
          <Cloud className="size-2.5" /> Connect Drive
        </button>
        <CloudConnectDialog open={dialogOpen} onOpenChange={setDialogOpen} status={status} onConnect={connect} />
      </>
    );
  }

  if (status === "connecting" || status === "syncing") {
    return (
      <>
        <button
          disabled
          className="flex items-center gap-1 rounded-md px-2 py-1 text-info"
        >
          <RefreshCw className="size-2.5 animate-spin" />
          {status === "connecting" ? "Connecting…" : "Syncing…"}
        </button>
        <CloudConnectDialog open={dialogOpen} onOpenChange={setDialogOpen} status={status} onConnect={connect} />
      </>
    );
  }

  if (status === "error") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-2 py-1 text-danger transition-colors hover:bg-white/5">
          <AlertTriangle className="size-2.5" /> Sync failed
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => sync()}>Retry sync</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={disconnect}>
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-2 py-1 text-success transition-colors hover:bg-white/5">
        <span className="size-1 rounded-full bg-success" /> Cloud Connected
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-1.5 py-1.5">
          <p className="text-sm font-medium">{account ? PROVIDER_LABEL[account.provider] : "Cloud Drive"}</p>
          <p className="text-xs text-muted-foreground">{account?.email}</p>
          {lastSyncedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Synced {fileCount} files · {formatRelativeTime(lastSyncedAt)}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setBrowserOpen(true)}>View files</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => sync()}>Sync now</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={disconnect}>
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
      <CloudFileBrowserDialog open={browserOpen} onOpenChange={setBrowserOpen} />
    </DropdownMenu>
  );
}
