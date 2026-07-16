import type { AssetStatus } from "@/types";
import { getStatusMeta } from "@/utils/assetStatus";

export function StatusBadge({ status, version }: { status: AssetStatus; version: string }) {
  const meta = getStatusMeta(status, version);
  return (
    <span className={`flex items-center gap-1.5 text-sm font-medium ${meta.textClass}`}>
      <span className={`size-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
}
