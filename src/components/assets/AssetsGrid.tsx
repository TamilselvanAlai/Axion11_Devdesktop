import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/assets/StatusBadge";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { AssetPreviewModal } from "@/components/assets/AssetPreviewModal";
import { AssetVersionCompareModal } from "@/components/assets/AssetVersionCompareModal";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/store";
import { formatRelativeTime, getInitials } from "@/utils/formatters";
import { isUrl } from "@/utils/helpers";
import { sortAssets } from "@/utils/assetSort";
import { filterAssets } from "@/utils/assetFilters";
import { useScrollToSelectedAsset } from "@/hooks/useScrollToSelectedAsset";
import type { Asset, AssetFileType } from "@/types";

const TYPE_BADGE_CLASS: Record<AssetFileType, string> = {
  TIFF: "bg-blue-500/15 text-blue-400",
  PSD: "bg-amber-500/15 text-amber-400",
  CR3: "bg-emerald-500/15 text-emerald-400",
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

export function AssetsGrid({ assets }: { assets: Asset[] }) {
  const { selectedAssetId, selectAssetAndReveal, sortKey, sortAsc, filters, multiSelectedIds, toggleMultiSelect, selectRange } =
    useAssetStore();
  const rows = sortAssets(filterAssets(assets, filters), sortKey, sortAsc);
  useScrollToSelectedAsset(selectedAssetId, [rows.length]);
  const lastClickedIndex = useRef<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [compareAssetId, setCompareAssetId] = useState<string | null>(null);

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

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">No assets here yet</p>
        <p className="text-xs text-muted-foreground">Upload files to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 @min-[560px]:grid-cols-3 @min-[820px]:grid-cols-4 @min-[1080px]:grid-cols-5">
      {rows.map((asset, index) => {
        const checked = multiSelectedIds.has(asset.id);
        return (
        <Card
          key={asset.id}
          data-asset-row={asset.id}
          className={cn(
            "group cursor-pointer gap-0 overflow-hidden p-0 ring-1 ring-foreground/10 transition-colors",
            (selectedAssetId === asset.id || checked) && "ring-2 ring-primary"
          )}
          onClick={() => selectAssetAndReveal(asset)}
        >
          <div className="relative h-40 w-full shrink-0" onDoubleClick={(e) => { e.stopPropagation(); setPreviewIndex(index); }}>
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
            <p className="truncate text-sm font-semibold">{asset.name}</p>

            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={asset.status} version={asset.version} />
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
        );
      })}

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
        <AssetVersionCompareModal assetId={compareAssetId} onClose={() => setCompareAssetId(null)} />
      )}
    </div>
  );
}
