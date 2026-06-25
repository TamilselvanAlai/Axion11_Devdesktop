import { CheckCircle, Lock, Eye } from "lucide-react";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { formatRelativeTime } from "@/utils/formatters";
import type { AssetDetail } from "@/types";

const STATUS_META: Record<AssetDetail["status"], { label: string; dotClass: string; textClass: string }> = {
  approved: { label: "Approved", dotClass: "bg-success", textClass: "text-success" },
  pending: { label: "Pending", dotClass: "bg-warning", textClass: "text-warning" },
  "in-review": { label: "In Review", dotClass: "bg-info", textClass: "text-info" },
  rejected: { label: "Rejected", dotClass: "bg-danger", textClass: "text-danger" },
  processing: { label: "Processing", dotClass: "bg-muted-foreground", textClass: "text-muted-foreground" },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AssetInfoPanel({ detail }: { detail: AssetDetail }) {
  const status = STATUS_META[detail.status];

  const rows = [
    { label: "Filename", value: detail.filename },
    { label: "Format", value: detail.fileType },
    { label: "Size", value: detail.sizeMb >= 1000 ? `${(detail.sizeMb / 1000).toFixed(1)} GB` : `${detail.sizeMb} MB` },
    { label: "SKU", value: detail.sku },
    { label: "Batch", value: detail.batch },
    { label: "ETA", value: formatDateTime(detail.etaAt) },
    { label: "Assigned", value: detail.assignee.name },
    { label: "Modified", value: formatRelativeTime(detail.modifiedAt) },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <div className="h-36 w-full overflow-hidden rounded-lg border border-border bg-background">
            <AssetThumbnail color={detail.thumbnailColor} className="size-full" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className={`flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs ${status.textClass}`}>
              <span className={`size-1.5 rounded-full ${status.dotClass}`} /> {status.label}
            </span>
            <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-xs text-foreground/70">{detail.version}</span>
            {detail.status !== "rejected" && (
              <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground">
                <CheckCircle className="size-2.5 text-success" /> Checksum OK
              </span>
            )}
            {detail.status !== "rejected" && (
              <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground">
                <Lock className="size-2.5" /> {detail.locked ? "Locked" : "Unlocked"}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-2">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{row.label}</span>
                <span className="truncate text-right font-mono text-xs leading-relaxed text-foreground/70">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-accent">
            <Eye className="size-3" /> Open File
          </button>
          <button className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white/5 px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-white/10">
            <Eye className="size-3" /> Preview
          </button>
        </div>
      </div>
    </div>
  );
}
