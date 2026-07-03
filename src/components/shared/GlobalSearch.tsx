import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, FileText, Folder } from "lucide-react";
import { assetService } from "@/services/asset.service";
import { searchAuditService } from "@/services/searchAudit.service";
import { useAssetStore } from "@/store";
import { ROUTES } from "@/constants/routes";
import type { Asset, ProjectNode } from "@/types";

interface FolderMatch {
  id: string;
  name: string;
}

function searchTree(nodes: ProjectNode[], query: string, matches: FolderMatch[] = []): FolderMatch[] {
  for (const node of nodes) {
    if (node.name.toLowerCase().includes(query)) {
      matches.push({ id: node.id, name: node.name });
    }
    if (node.children?.length) searchTree(node.children, query, matches);
  }
  return matches;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const projectTree = useAssetStore((s) => s.projectTree);
  const selectAsset = useAssetStore((s) => s.selectAsset);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assetResults, setAssetResults] = useState<Asset[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const folderResults = query.trim().length >= 2 ? searchTree(projectTree, query.trim().toLowerCase()).slice(0, 5) : [];

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setAssetResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      assetService
        .searchByName(trimmed)
        .then((results) => {
          if (cancelled) return;
          setAssetResults(results.slice(0, 8));
          searchAuditService.logSearch(trimmed, "assets", results.length);
        })
        .catch(() => {
          if (!cancelled) setAssetResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  function goToAsset(asset: Asset) {
    const target = asset.batchId ?? asset.projectId;
    if (!target) return;
    setOpen(false);
    setQuery("");
    navigate(`${ROUTES.projects}/${target}`);
    selectAsset(asset.id);
  }

  function goToFolder(folder: FolderMatch) {
    setOpen(false);
    setQuery("");
    navigate(`${ROUTES.projects}/${folder.id}`);
  }

  const hasResults = assetResults.length > 0 || folderResults.length > 0;
  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-100">
      <div className="flex w-full items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1.5 transition-colors focus-within:border-white/20">
        {loading ? (
          <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Search className="size-3 shrink-0 text-muted-foreground" />
        )}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search assets, batches, SKUs…"
          className="w-full min-w-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border border-border bg-popover shadow-xl">
          {!hasResults && !loading ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">No results for "{query}"</p>
          ) : (
            <>
              {folderResults.length > 0 && (
                <div className="border-b border-border py-1">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Batches &amp; Projects
                  </p>
                  {folderResults.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => goToFolder(folder)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <Folder className="size-3.5 shrink-0 text-primary" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {assetResults.length > 0 && (
                <div className="py-1">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Assets
                  </p>
                  {assetResults.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => goToAsset(asset)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{asset.name}</span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                        {asset.fileType}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
