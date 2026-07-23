import { useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/assets/StatusBadge";
import { FileTypeBadge } from "@/components/assets/FileTypeBadge";
import { AssigneeBadge } from "@/components/assets/AssigneeBadge";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { AssetPreviewModal } from "@/components/assets/AssetPreviewModal";
import { AssetVersionCompareModal } from "@/components/assets/AssetVersionCompareModal";
import { EstablishedBadge } from "@/components/assets/EstablishedBadge";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/store";
import { sortAssets } from "@/utils/assetSort";
import { filterAssets } from "@/utils/assetFilters";
import { isUrl } from "@/utils/helpers";
import { useScrollToSelectedAsset } from "@/hooks/useScrollToSelectedAsset";
import type { Asset, AssetSortKey } from "@/types";

const COLUMNS: { key: AssetSortKey; label: string }[] = [
  { key: "name", label: "Asset Name" },
  { key: "status", label: "Status" },
  { key: "fileType", label: "Type" },
  { key: "sizeMb", label: "Size" },
  { key: "version", label: "Ver." },
  { key: "assignee", label: "Assigned" },
  { key: "updatedAt", label: "Date & Time" },
];

const DEFAULT_COLUMN_WIDTHS: Record<AssetSortKey, number> = {
  name: 280,
  status: 110,
  fileType: 90,
  sizeMb: 90,
  version: 110,
  assignee: 170,
  updatedAt: 170,
};

const MIN_COLUMN_WIDTH = 60;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(mb: number) {
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`;
}

export function AssetsTable({ assets }: { assets: Asset[] }) {
  const {
    sortKey,
    sortAsc,
    toggleSort,
    selectedAssetId,
    selectAssetAndReveal,
    filters,
    multiSelectedIds,
    toggleMultiSelect,
    selectRange,
    refetchAssets,
  } = useAssetStore();
  const rows = sortAssets(filterAssets(assets, filters), sortKey, sortAsc);
  useScrollToSelectedAsset(selectedAssetId, [rows.length]);
  const lastClickedIndex = useRef<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [compareAssetId, setCompareAssetId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<AssetSortKey, number>>(DEFAULT_COLUMN_WIDTHS);

  function handleCheckboxClick(e: React.MouseEvent, index: number, assetId: string) {
    e.stopPropagation();
    if (e.shiftKey && lastClickedIndex.current !== null) {
      const [start, end] = [lastClickedIndex.current, index].sort((a, b) => a - b);
      selectRange(rows.slice(start, end + 1).map((r) => r.id));
    } else {
      toggleMultiSelect(assetId);
    }
    lastClickedIndex.current = index;
  }

  function handleColumnResizeStart(key: AssetSortKey, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[key];

    function handleMove(moveEvent: MouseEvent) {
      const next = Math.max(MIN_COLUMN_WIDTH, startWidth + (moveEvent.clientX - startX));
      setColumnWidths((prev) => ({ ...prev, [key]: next }));
    }
    function handleUp() {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">No assets here yet</p>
        <p className="text-xs text-muted-foreground">Upload files to get started.</p>
      </div>
    );
  }

  return (
    <>
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">
            <Checkbox
              checked={rows.length > 0 && rows.every((r) => multiSelectedIds.has(r.id))}
              onCheckedChange={(checked) => {
                rows.forEach((r) => {
                  const isChecked = multiSelectedIds.has(r.id);
                  if (checked && !isChecked) toggleMultiSelect(r.id);
                  if (!checked && isChecked) toggleMultiSelect(r.id);
                });
              }}
              aria-label="Select all"
            />
          </TableHead>
          {COLUMNS.map((col) => (
            <TableHead key={col.key} className="relative overflow-hidden" style={{ width: columnWidths[col.key] }}>
              <button
                type="button"
                onClick={() => toggleSort(col.key)}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                {col.label}
                {sortKey === col.key &&
                  (sortAsc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
              </button>
              <div
                onMouseDown={(e) => handleColumnResizeStart(col.key, e)}
                role="separator"
                aria-orientation="vertical"
                aria-label={`Resize ${col.label} column`}
                className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize select-none hover:bg-primary/50 active:bg-primary"
              />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((asset, index) => (
          <TableRow
            key={asset.id}
            data-asset-row={asset.id}
            className={cn("group cursor-pointer", (selectedAssetId === asset.id || multiSelectedIds.has(asset.id)) && "bg-muted")}
            onClick={() => selectAssetAndReveal(asset)}
          >
            <TableCell onClick={(e) => handleCheckboxClick(e, index, asset.id)}>
              <Checkbox checked={multiSelectedIds.has(asset.id)} aria-label={`Select ${asset.name}`} />
            </TableCell>
            <TableCell>
              <div
                className="flex min-w-0 items-center gap-3"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex(index);
                }}
              >
                <AssetThumbnail color={asset.thumbnailColor} />
                <span className="min-w-0 flex-1 truncate font-medium">{asset.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <StatusBadge status={asset.status} version={asset.version} />
            </TableCell>
            <TableCell>
              <FileTypeBadge fileType={asset.fileType} />
            </TableCell>
            <TableCell className="text-muted-foreground">{formatSize(asset.sizeMb)}</TableCell>
            <TableCell className="text-muted-foreground">
              <div className="flex items-center gap-1.5">
                {asset.version}
                {asset.established && <EstablishedBadge />}
              </div>
            </TableCell>
            <TableCell>
              <AssigneeBadge assignee={asset.assignee} />
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDateTime(asset.updatedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>

    {previewIndex !== null && rows[previewIndex] && !compareAssetId && (
      <AssetPreviewModal
        imageUrl={isUrl(rows[previewIndex].thumbnailColor) ? rows[previewIndex].thumbnailColor : null}
        filename={rows[previewIndex].name}
        onClose={() => setPreviewIndex(null)}
        onPrev={() => setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
        onNext={() => setPreviewIndex((i) => (i !== null && i < rows.length - 1 ? i + 1 : i))}
        hasPrev={previewIndex > 0}
        hasNext={previewIndex < rows.length - 1}
        onReview={() => setCompareAssetId(rows[previewIndex].id)}
      />
    )}

    {compareAssetId && (
      <AssetVersionCompareModal
        assetId={compareAssetId}
        onClose={() => setCompareAssetId(null)}
        onStatusChange={refetchAssets}
      />
    )}
    </>
  );
}
