import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Download, ImageOff, Check, Loader2, Rocket } from "lucide-react";
import { AssetCommentsPanel } from "@/components/assets/AssetCommentsPanel";
import { EstablishedBadge } from "@/components/assets/EstablishedBadge";
import { getStatusMeta } from "@/utils/assetStatus";
import { formatRelativeTime } from "@/utils/formatters";
import { isUrl } from "@/utils/helpers";
import { assetService } from "@/services/asset.service";
import { useUser } from "@/hooks/useUser";
import type { Asset } from "@/types";

interface AssetVersionCompareModalProps {
  /** Any version's id in the chain — the full chain is resolved from this. */
  assetId: string;
  onClose: () => void;
  /** Called after approve/reject/publish so the caller can refresh whatever list it owns. */
  onStatusChange?: () => void;
}

function VersionImage({ version }: { version: Asset | undefined }) {
  const url = version && isUrl(version.thumbnailColor) ? version.thumbnailColor : null;
  return (
    <div className="flex flex-1 items-center justify-center overflow-hidden bg-black/40 p-4">
      {url ? (
        <img src={url} alt={version?.name ?? ""} className="max-h-full max-w-full rounded-md object-contain shadow-2xl" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-white/40">
          <ImageOff className="size-8" />
          <p className="text-xs">No preview available</p>
        </div>
      )}
    </div>
  );
}

function VersionSelect({
  versions,
  value,
  exclude,
  onChange,
}: {
  versions: Asset[];
  value: string;
  exclude: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full cursor-pointer appearance-none border-b border-white/10 bg-black/60 px-3 py-2 text-center text-xs font-medium text-white/80 outline-none"
    >
      {versions
        .filter((v) => v.id === value || v.id !== exclude)
        .map((v) => (
          <option key={v.id} value={v.id}>
            {v.version} · {v.name}
            {v.established ? " · VE" : ""}
          </option>
        ))}
    </select>
  );
}

export function AssetVersionCompareModal({ assetId, onClose, onStatusChange }: AssetVersionCompareModalProps) {
  const [versions, setVersions] = useState<Asset[] | null>(null);
  const [leftId, setLeftId] = useState<string>(assetId);
  const [rightId, setRightId] = useState<string>(assetId);
  const [deciding, setDeciding] = useState<"approve" | "reject" | "publish" | null>(null);
  const user = useUser();
  const isQc = user?.role === "qc" || user?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    assetService.getVersions(assetId).then((data) => {
      if (cancelled || data.length === 0) return;
      setVersions(data);
      // Default: compare v1 against whichever version was actually opened (not necessarily
      // the highest number — an editor reviewing an older version should land on that one).
      setLeftId(data[0].id);
      setRightId(data.find((v) => v.id === assetId)?.id ?? data[data.length - 1].id);
    });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const left = versions?.find((v) => v.id === leftId);
  const right = versions?.find((v) => v.id === rightId);

  async function handleDecision(decision: "approve" | "reject" | "publish") {
    if (!right) return;
    setDeciding(decision);
    try {
      if (decision === "approve") await assetService.approveAsset(right.id);
      else if (decision === "reject") await assetService.rejectAsset(right.id);
      else await assetService.publishAsset(right.id);
      toast.success(
        decision === "approve" ? "Asset approved." : decision === "reject" ? "Asset rejected." : "Asset published live."
      );
      const refreshed = await assetService.getVersions(assetId);
      setVersions(refreshed);
      onStatusChange?.();
    } catch {
      toast.error(`Failed to ${decision} asset.`);
    } finally {
      setDeciding(null);
    }
  }

  function handleDownload() {
    if (!right || !isUrl(right.thumbnailColor)) {
      toast.error("No file available to download.");
      return;
    }
    window.open(right.thumbnailColor, "_blank");
  }

  const rightStatus = right ? getStatusMeta(right.status, right.version) : null;

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{right?.name ?? "Loading…"}</h2>
            {right && <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-xs text-foreground/70">{right.version}</span>}
            {right?.established && <EstablishedBadge />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!right}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-white/5 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-3" /> Download
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {versions && (
            <div className="flex shrink-0">
              <div className="flex-1">
                <VersionSelect versions={versions} value={leftId} exclude={rightId} onChange={setLeftId} />
              </div>
              <div className="flex-1">
                <VersionSelect versions={versions} value={rightId} exclude={leftId} onChange={setRightId} />
              </div>
            </div>
          )}
          <div className="flex min-h-0 flex-1">
            <VersionImage version={left} />
            <div className="w-px shrink-0 bg-white/10" />
            <VersionImage version={right} />
          </div>
        </div>

        <div className="flex w-80 shrink-0 flex-col border-l border-border bg-muted">
          <div className="shrink-0 border-b border-border p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Versions
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {versions?.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setRightId(v.id)}
                  className={`relative aspect-square overflow-hidden rounded-md ring-2 transition-colors ${
                    v.id === rightId ? "ring-primary" : "ring-transparent hover:ring-white/20"
                  }`}
                >
                  {isUrl(v.thumbnailColor) ? (
                    <img src={v.thumbnailColor} alt={v.version} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-white/5">
                      <ImageOff className="size-3 text-white/30" />
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[9px] font-semibold text-white">
                    {v.version}
                  </span>
                  {v.established && (
                    <span className="absolute right-0.5 top-0.5 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-black">
                      E
                    </span>
                  )}
                </button>
              ))}
            </div>
            {right && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                {formatRelativeTime(right.updatedAt)} · {right.assignee.name}
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1">
            {right && <AssetCommentsPanel assetId={right.id} />}
          </div>

          {isQc && right && (
            <div className="shrink-0 border-t border-border p-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDecision("approve")}
                  disabled={deciding !== null || right.status === "approved" || right.status === "live"}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-success px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deciding === "approve" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision("reject")}
                  disabled={deciding !== null || right.status === "rejected" || right.status === "live"}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-danger px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deciding === "reject" ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                  Reject
                </button>
              </div>
              {right.status === "approved" && (
                <button
                  type="button"
                  onClick={() => handleDecision("publish")}
                  disabled={deciding !== null}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-info px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-info/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deciding === "publish" ? <Loader2 className="size-3 animate-spin" /> : <Rocket className="size-3" />}
                  Publish to Live
                </button>
              )}
              {rightStatus && (
                <p className={`mt-2 text-center text-[10px] ${rightStatus.textClass}`}>
                  Currently viewing: {rightStatus.label} — actions apply to {right.version}, not the latest version.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
