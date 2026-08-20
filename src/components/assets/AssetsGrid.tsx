import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/assets/StatusBadge";
import { SyncStatusIcon } from "@/components/assets/SyncStatusIcon";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { AssetUploadingGridTile, type AssetUploadPhase } from "@/components/assets/AssetsSkeleton";
import { AssetVersionCompareModal } from "@/components/assets/AssetVersionCompareModal";
import { AssetRowContextMenu } from "@/components/assets/AssetRowContextMenu";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/store";
import { formatRelativeTime, getInitials } from "@/utils/formatters";
import { sortAssets } from "@/utils/assetSort";
import { filterAssets } from "@/utils/assetFilters";
import { useScrollToSelectedAsset } from "@/hooks/useScrollToSelectedAsset";
import type { Asset, AssetFileType } from "@/types";

// Every RAW camera format (Canon, Sony, Adobe DNG, Fujifilm, Hasselblad, Nikon, Olympus,
// Panasonic, and generic .raw) shares one color family — see FileTypeBadge for the same choice.
const RAW_BADGE_CLASS = "bg-orange-500/15 text-orange-400";

const TYPE_BADGE_CLASS: Record<AssetFileType, string> = {
  TIFF: "bg-blue-500/15 text-blue-400",
  PSD: "bg-amber-500/15 text-amber-400",
  CR2: RAW_BADGE_CLASS,
  CR3: RAW_BADGE_CLASS,
  CRW: RAW_BADGE_CLASS,
  ARW: RAW_BADGE_CLASS,
  SRF: RAW_BADGE_CLASS,
  SR2: RAW_BADGE_CLASS,
  DNG: RAW_BADGE_CLASS,
  RAF: RAW_BADGE_CLASS,
  "3FR": RAW_BADGE_CLASS,
  FFF: RAW_BADGE_CLASS,
  NEF: RAW_BADGE_CLASS,
  NRW: RAW_BADGE_CLASS,
  ORF: RAW_BADGE_CLASS,
  RW2: RAW_BADGE_CLASS,
  RWL: RAW_BADGE_CLASS,
  PEF: RAW_BADGE_CLASS,
  PTX: RAW_BADGE_CLASS,
  SRW: RAW_BADGE_CLASS,
  X3F: RAW_BADGE_CLASS,
  IIQ: RAW_BADGE_CLASS,
  MEF: RAW_BADGE_CLASS,
  MOS: RAW_BADGE_CLASS,
  ERF: RAW_BADGE_CLASS,
  KDC: RAW_BADGE_CLASS,
  DCR: RAW_BADGE_CLASS,
  MRW: RAW_BADGE_CLASS,
  GPR: RAW_BADGE_CLASS,
  RAW: RAW_BADGE_CLASS,
  HEIC: "bg-emerald-500/15 text-emerald-400",
  JPG: "bg-violet-500/15 text-violet-400",
  PNG: "bg-violet-500/15 text-violet-400",
  WEBP: "bg-violet-500/15 text-violet-400",
  MP4: "bg-pink-500/15 text-pink-400",
  ZIP: "bg-warning/15 text-warning",
  OTHER: "bg-white/10 text-muted-foreground",
};

function formatSize(sizeMb: number) {
  return sizeMb >= 1000 ? `${(sizeMb / 1000).toFixed(1)} GB` : `${Math.round(sizeMb)} MB`;
}

export function AssetsGrid({
  assets,
  uploadingFiles = [],
  uploadingPhase = "uploading",
}: {
  assets: Asset[];
  uploadingFiles?: string[];
  uploadingPhase?: AssetUploadPhase;
}) {
  const { selectedAssetId, selectAssetAndReveal, sortKey, sortAsc, filters, multiSelectedIds, toggleMultiSelect, selectRange } =
    useAssetStore();
  const rows = sortAssets(filterAssets(assets, filters), sortKey, sortAsc);
  useScrollToSelectedAsset(selectedAssetId, [rows.length]);
  const lastClickedIndex = useRef<number | null>(null);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);

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

  if (rows.length === 0 && uploadingFiles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">No assets here yet</p>
        <p className="text-xs text-muted-foreground">Upload files to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 @min-[560px]:grid-cols-3 @min-[820px]:grid-cols-4 @min-[1080px]:grid-cols-5">
      {uploadingFiles.map((name, i) => (
        <AssetUploadingGridTile key={`uploading-${i}-${name}`} name={name} phase={uploadingPhase} />
      ))}
      {rows.map((asset, index) => {
        const checked = multiSelectedIds.has(asset.id);
        return (
        <AssetRowContextMenu key={asset.id} asset={asset}>
        <Card
          data-asset-row={asset.id}
          className={cn(
            "group cursor-pointer gap-0 overflow-hidden p-0 ring-1 ring-foreground/10 transition-colors",
            "animate-in fade-in zoom-in-95 duration-300",
            (selectedAssetId === asset.id || checked) && "ring-2 ring-primary"
          )}
          onClick={() => selectAssetAndReveal(asset)}
        >
          <div className="relative h-40 w-full shrink-0" onDoubleClick={(e) => { e.stopPropagation(); setCompareIndex(index); }}>
            <AssetThumbnail color={asset.thumbnailColor} className="size-full" rounded={false} />
            <span
              onClick={(e) => handleCheckboxClick(e, index, asset.id)}
              className={cn(
                "absolute left-2 top-2 z-10 flex size-5 items-center justify-center rounded-md bg-black/50 backdrop-blur-sm transition-opacity",
                checked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <Checkbox checked={checked} className="border-white/60" />
            </span>
            <span
              className={cn(
                "absolute bottom-2 left-2 rounded-md px-1.5 py-0.5 text-xs font-semibold tracking-wide backdrop-blur-sm",
                TYPE_BADGE_CLASS[asset.fileType]
              )}
            >
              {asset.fileType}
            </span>
            <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              {asset.version}
            </span>
          </div>

          <div className="flex flex-col gap-2 p-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{asset.name}</p>
              <SyncStatusIcon asset={asset} className="size-3.5" />
            </div>

            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={asset.status} established={asset.established} />
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatSize(asset.sizeMb)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Avatar size="sm" className="bg-primary/20">
                  <AvatarFallback className="bg-transparent text-[9px] font-semibold text-primary">
                    {asset.assignee.initials || getInitials(asset.assignee.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs font-medium">{asset.assignee.name}</span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(asset.updatedAt)}</span>
            </div>
          </div>
        </Card>
        </AssetRowContextMenu>
        );
      })}

      {compareIndex !== null && rows[compareIndex] && (
        <AssetVersionCompareModal
          assetId={rows[compareIndex].id}
          initialLayout="individual"
          onClose={() => setCompareIndex(null)}
          onPrev={() => setCompareIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setCompareIndex((i) => (i !== null && i < rows.length - 1 ? i + 1 : i))}
          hasPrev={compareIndex > 0}
          hasNext={compareIndex < rows.length - 1}
        />
      )}
    </div>
  );
}
