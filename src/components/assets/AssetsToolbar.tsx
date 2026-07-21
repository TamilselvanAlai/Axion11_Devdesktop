import { useRef, useState, Fragment } from "react";
import { toast } from "sonner";
import { Filter, SortAsc, SortDesc, LayoutGrid, List, Upload, ChevronRight, ChevronDown, File, FolderUp, Cloud, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CloudFileBrowserDialog } from "@/components/assets/CloudFileBrowserDialog";
import { AssetsFilterBar } from "@/components/assets/AssetsFilterBar";
import { useAssetStore } from "@/store";
import { useUser } from "@/hooks/useUser";
import { createAssetsFromFiles } from "@/utils/uploads";
import { assetService } from "@/services/asset.service";
import { hasActiveFilters } from "@/utils/assetFilters";
import type { Asset, AssetSortKey } from "@/types";

const SORT_OPTIONS: { key: AssetSortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "updatedAt", label: "Date modified" },
  { key: "sizeMb", label: "Size" },
  { key: "status", label: "Status" },
  { key: "fileType", label: "Type" },
  { key: "assignee", label: "Assignee" },
];

interface AssetsToolbarProps {
  breadcrumbs: string[];
  count: number;
  countLabel: string;
  projectId?: string;
  assets?: Asset[];
}

export function AssetsToolbar({ breadcrumbs, count, countLabel, projectId, assets = [] }: AssetsToolbarProps) {
  const { viewMode, setViewMode, addAssets, setAssets, filters, sortKey, sortAsc, toggleSort, multiSelectedIds, clearMultiSelect } =
    useAssetStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const [cloudBrowserOpen, setCloudBrowserOpen] = useState(false);
  const user = useUser();
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const assignee = user ? { name: user.name, initials: user.initials } : { name: "Jordan K.", initials: "JK" };
    const newAssets = createAssetsFromFiles(fileList, projectId ?? "unassigned", assignee);
    addAssets(newAssets);
    toast.success(`${newAssets.length} item${newAssets.length === 1 ? "" : "s"} queued for upload`);
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-border pb-2">
    <div className="flex items-center gap-2">
      <input
        ref={filesInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error -- non-standard attribute that enables folder selection in supporting browsers
        webkitdirectory="true"
        directory="true"
        className="hidden"
        onChange={(e) => {
          handleFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="mr-2 flex items-center gap-1 text-xs text-muted-foreground">
        {breadcrumbs.map((crumb, i) => (
          <Fragment key={crumb}>
            {i > 0 && <ChevronRight className="size-2.5" />}
            <span className={i === breadcrumbs.length - 1 ? "font-medium text-foreground" : ""}>{crumb}</span>
          </Fragment>
        ))}
      </div>

      {multiSelectedIds.size > 0 && (
        <div className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
          {multiSelectedIds.size} selected
          <button type="button" onClick={clearMultiSelect} className="text-primary/70 hover:text-primary">
            Clear
          </button>
        </div>
      )}

      <div className="h-4 w-px bg-border" />

      <button
        type="button"
        onClick={() => setFilterOpen((open) => !open)}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
          filterOpen || hasActiveFilters(filters)
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
        }`}
      >
        <Filter className="size-3" /> Filter
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            {sortAsc ? <SortAsc className="size-3" /> : <SortDesc className="size-3" />} Sort <ChevronDown className="size-2.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {SORT_OPTIONS.map((opt) => (
            <DropdownMenuItem key={opt.key} onSelect={() => toggleSort(opt.key)}>
              {sortKey === opt.key ? <Check className="size-4" /> : <span className="size-4" />}
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      <span className="text-xs text-muted-foreground">
        {count} assets · {countLabel}
      </span>

      <div className="flex items-center rounded-lg border border-border bg-muted p-0.5">
        <button
          type="button"
          aria-label="Grid view"
          aria-pressed={viewMode === "grid"}
          onClick={() => setViewMode("grid")}
          className={`flex size-7 items-center justify-center rounded-md transition-colors ${
            viewMode === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="List view"
          aria-pressed={viewMode === "list"}
          onClick={() => setViewMode("list")}
          className={`flex size-7 items-center justify-center rounded-md transition-colors ${
            viewMode === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="size-3.5" />
        </button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-accent"
          >
            <Upload className="size-3" /> Upload
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => filesInputRef.current?.click()}>
            <File className="size-4" /> Upload Files
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => folderInputRef.current?.click()}>
            <FolderUp className="size-4" /> Upload Folder
          </DropdownMenuItem>
          {projectId && (
            <DropdownMenuItem onSelect={() => setCloudBrowserOpen(true)}>
              <Cloud className="size-4" /> Import from Cloud Drive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {projectId && (
        <CloudFileBrowserDialog
          open={cloudBrowserOpen}
          onOpenChange={setCloudBrowserOpen}
          batchId={projectId}
          onImported={() => {
            assetService.listAssets({ projectId }).then(setAssets);
          }}
        />
      )}
    </div>

      {filterOpen && <AssetsFilterBar assets={assets} />}
    </div>
  );
}
