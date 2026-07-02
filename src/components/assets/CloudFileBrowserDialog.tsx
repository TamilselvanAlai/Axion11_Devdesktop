import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Folder, File, Loader2, ChevronRight, Cloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useCloudSync } from "@/hooks/useCloudSync";
import { cloudConnectionService, type CloudBrowseItem } from "@/services/cloudConnection.service";
import { PROVIDER_LABEL } from "@/services/cloudSync.service";

interface CloudFileBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to browse read-only (e.g. "what's in my drive") with no import target. */
  batchId?: string;
  onImported?: () => void;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function CloudFileBrowserDialog({ open, onOpenChange, batchId, onImported }: CloudFileBrowserDialogProps) {
  const { status, account } = useCloudSync();
  const connected = status === "connected" || status === "synced";

  const [breadcrumb, setBreadcrumb] = useState<{ id: string | undefined; name: string }[]>([
    { id: undefined, name: "Root" },
  ]);
  const [items, setItems] = useState<CloudBrowseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, CloudBrowseItem>>(new Map());
  const [importing, setImporting] = useState(false);

  const currentFolderId = breadcrumb[breadcrumb.length - 1].id;

  useEffect(() => {
    if (!open || !connected || !account) return;
    let cancelled = false;
    setLoading(true);
    setBrowseError(null);
    cloudConnectionService
      .browse(account.provider, currentFolderId)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to browse folder.";
        setBrowseError(message);
        setItems([]);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, connected, account, currentFolderId]);

  useEffect(() => {
    if (!open) {
      setBreadcrumb([{ id: undefined, name: "Root" }]);
      setItems([]);
      setSelected(new Map());
      setBrowseError(null);
    }
  }, [open]);

  function openFolder(item: CloudBrowseItem) {
    setBreadcrumb((prev) => [...prev, { id: item.id, name: item.name }]);
  }

  function toggleSelected(item: CloudBrowseItem) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  }

  const importMode = Boolean(batchId);

  async function handleImport() {
    if (!account || !batchId || selected.size === 0) return;
    setImporting(true);
    try {
      const result = await cloudConnectionService.importItems(account.provider, batchId, Array.from(selected.values()));
      toast.success(`Imported ${result.created + result.updated} file${result.created + result.updated === 1 ? "" : "s"}${result.errors ? ` (${result.errors} failed)` : ""}`);
      onImported?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !importing && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!importing}>
        <DialogHeader>
          <DialogTitle>
            {importMode ? "Import from " : "Browse "}
            {account ? PROVIDER_LABEL[account.provider] : "cloud drive"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {importMode
              ? "Select the files you want to bring into this batch."
              : "Files currently in your connected drive."}
          </p>
        </DialogHeader>

        {!connected ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Cloud className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Connect a cloud drive first from the header menu.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {breadcrumb.map((crumb, i) => (
                <span key={`${crumb.id ?? "root"}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="size-3" />}
                  <button
                    type="button"
                    onClick={() => setBreadcrumb((prev) => prev.slice(0, i + 1))}
                    className={i === breadcrumb.length - 1 ? "font-medium text-foreground" : "hover:text-foreground"}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>

            <div className="h-72 overflow-y-auto rounded-lg border border-border">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : browseError ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
                  <p className="text-sm font-medium text-danger">Couldn't load this folder</p>
                  <p className="text-xs text-muted-foreground">{browseError}</p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  This folder is empty.
                </div>
              ) : (
                <div className="flex flex-col">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2.5 border-b border-border px-3 py-2 last:border-b-0 hover:bg-muted"
                    >
                      {!importMode || item.isFolder ? (
                        <span className="size-4 shrink-0" />
                      ) : (
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={() => toggleSelected(item)}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (item.isFolder) openFolder(item);
                          else if (importMode) toggleSelected(item);
                        }}
                        className="flex flex-1 items-center gap-2 truncate text-left text-sm"
                      >
                        {item.isFolder ? (
                          <Folder className="size-4 shrink-0 text-primary" />
                        ) : (
                          <File className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{item.name}</span>
                      </button>
                      {!item.isFolder && (
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {formatSize(item.size)}
                        </span>
                      )}
                      {item.isFolder && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            {importMode ? "Cancel" : "Close"}
          </Button>
          {importMode && (
            <Button onClick={handleImport} disabled={!connected || selected.size === 0 || importing}>
              {importing ? <Loader2 className="size-4 animate-spin" /> : null}
              Import {selected.size > 0 ? selected.size : ""} item{selected.size === 1 ? "" : "s"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
