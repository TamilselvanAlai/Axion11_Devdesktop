import { AssetsToolbar } from "@/components/assets/AssetsToolbar";
import { AssetsTable } from "@/components/assets/AssetsTable";
import { AssetsGrid } from "@/components/assets/AssetsGrid";
import { useAssets } from "@/hooks/useAssets";
import { useAssetStore } from "@/store";
import type { AssetScope } from "@/types";

interface AssetsScopeViewProps {
  scope: AssetScope;
  breadcrumbs: string[];
  countLabel: string;
}

export function AssetsScopeView({ scope, breadcrumbs, countLabel }: AssetsScopeViewProps) {
  const { assets, status } = useAssets(scope);
  const viewMode = useAssetStore((state) => state.viewMode);

  return (
    <div className="flex flex-col gap-2">
      <AssetsToolbar breadcrumbs={breadcrumbs} count={assets.length} countLabel={countLabel} />
      {status === "loading" && assets.length === 0 ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <AssetsGrid assets={assets} />
      ) : (
        <AssetsTable assets={assets} />
      )}
    </div>
  );
}
