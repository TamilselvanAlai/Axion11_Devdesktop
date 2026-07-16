import type { AssetStatus } from "@/types";

const STATUS_META: Record<AssetStatus, { label: string; dotClass: string; textClass: string }> = {
  draft: { label: "Draft", dotClass: "bg-amber-500", textClass: "text-amber-500" },
  approved: { label: "Approved", dotClass: "bg-emerald-500", textClass: "text-emerald-500" },
  rejected: { label: "Rejected", dotClass: "bg-red-500", textClass: "text-red-500" },
  live: { label: "Live", dotClass: "bg-blue-500", textClass: "text-blue-500" },
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`flex items-center gap-1.5 text-sm font-medium ${meta.textClass}`}>
      <span className={`size-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
}
