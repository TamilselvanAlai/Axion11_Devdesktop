import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/assets/StatusBadge";
import { FileTypeBadge } from "@/components/assets/FileTypeBadge";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/store";
import type { Asset } from "@/types";

export function AssetsGrid({ assets }: { assets: Asset[] }) {
  const { selectedAssetId, selectAsset } = useAssetStore();

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">No assets here yet</p>
        <p className="text-xs text-muted-foreground">Upload files to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <Card
          key={asset.id}
          className={cn("gap-3 p-3 cursor-pointer", selectedAssetId === asset.id && "border-primary")}
          onClick={() => selectAsset(asset.id)}
        >
          <AssetThumbnail color={asset.thumbnailColor} className="h-28 w-full rounded-lg" />
          <div className="flex flex-col gap-1.5 px-1">
            <p className="truncate text-sm font-medium">{asset.name}</p>
            <div className="flex items-center justify-between">
              <StatusBadge status={asset.status} />
              <FileTypeBadge fileType={asset.fileType} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
