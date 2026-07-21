import { AssetsToolbar } from "@/components/assets/AssetsToolbar";
import { AssetsTable } from "@/components/assets/AssetsTable";
import { AssetsGrid } from "@/components/assets/AssetsGrid";
import { AssetsSkeleton } from "@/components/assets/AssetsSkeleton";
import { useAssets } from "@/hooks/useAssets";
import { useAssetStore } from "@/store";
import { findAncestorPath } from "@/utils/assetPath";
import type { AssetScope } from "@/types";

interface AssetsScopeViewProps {
  scope: AssetScope;
  breadcrumbs: string[];
  countLabel: string;
}

export function AssetsScopeView({ scope, breadcrumbs, countLabel }: AssetsScopeViewProps) {
  const { assets, status } = useAssets(scope);
  const viewMode = useAssetStore((state) => state.viewMode);
  const selectedAssetId = useAssetStore((state) => state.selectedAssetId);
  const projectTree = useAssetStore((state) => state.projectTree);

  // Once an asset is selected, show where it actually lives instead of the generic scope
  // label — assets in "Recent"/"Transfers"/"All" can come from any folder in the tree.
  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const selectedPath = selectedAsset?.batchId ? findAncestorPath(projectTree, selectedAsset.batchId) : null;
  const displayBreadcrumbs = selectedPath ?? breadcrumbs;

  return (
    <div className="flex flex-col gap-2">
      <AssetsToolbar breadcrumbs={displayBreadcrumbs} count={assets.length} countLabel={countLabel} assets={assets} />
      {status === "loading" && assets.length === 0 ? (
        <AssetsSkeleton viewMode={viewMode} />
      ) : viewMode === "grid" ? (
        <AssetsGrid assets={assets} />
      ) : (
        <AssetsTable assets={assets} />
      )}
    </div>
  );
}
