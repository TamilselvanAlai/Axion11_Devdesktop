import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useAssetStore } from "@/store";
import { hasActiveFilters } from "@/utils/assetFilters";
import type { Asset, AssetFileType, AssetStatus, ProjectNode } from "@/types";

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "in-review", label: "In Review" },
  { value: "rejected", label: "Rejected" },
  { value: "processing", label: "Processing" },
];

const TYPE_OPTIONS: AssetFileType[] = ["TIFF", "PSD", "CR3", "JPG", "PNG", "MP4", "ZIP", "OTHER"];

function findNodeName(nodes: ProjectNode[], id: string): string | null {
  for (const node of nodes) {
    if (node.id === id) return node.name;
    if (node.children?.length) {
      const found = findNodeName(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const active = value !== "";
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 cursor-pointer appearance-none rounded-lg border bg-muted px-2.5 pr-7 text-xs font-medium outline-none transition-colors ${
          active ? "border-primary/40 text-primary" : "border-border text-muted-foreground"
        }`}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function AssetsFilterBar({ assets }: { assets: Asset[] }) {
  const { filters, setFilter, clearFilters, projectTree } = useAssetStore();

  const batchOptions = useMemo(() => {
    const ids = Array.from(new Set(assets.map((a) => a.batchId).filter((id): id is string => Boolean(id))));
    return ids
      .map((id) => ({ value: id, label: findNodeName(projectTree, id) ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [assets, projectTree]);

  const assigneeOptions = useMemo(() => {
    const names = Array.from(new Set(assets.map((a) => a.assignee.name).filter(Boolean)));
    return names.sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }));
  }, [assets]);

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span className="text-xs font-medium text-muted-foreground">Filters:</span>
      <Select
        label="All Status"
        value={filters.status ?? ""}
        options={STATUS_OPTIONS}
        onChange={(v) => setFilter("status", (v || null) as AssetStatus | null)}
      />
      <Select
        label="All Types"
        value={filters.fileType ?? ""}
        options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
        onChange={(v) => setFilter("fileType", (v || null) as AssetFileType | null)}
      />
      <Select
        label="All Batches"
        value={filters.batchId ?? ""}
        options={batchOptions}
        onChange={(v) => setFilter("batchId", v || null)}
      />
      <Select
        label="All Assignees"
        value={filters.assigneeName ?? ""}
        options={assigneeOptions}
        onChange={(v) => setFilter("assigneeName", v || null)}
      />
      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={clearFilters}
          className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
