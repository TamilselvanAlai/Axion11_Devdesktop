import { ChevronRight, Folder } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/store";
import { useFolderDropTarget } from "@/hooks/useFolderDropTarget";
import { toUploadTarget } from "@/utils/dragDropFiles";
import type { ProjectNode } from "@/types";
import { ROUTES } from "@/constants/routes";

function TreeNode({ node, depth }: { node: ProjectNode; depth: number }) {
  const navigate = useNavigate();
  const { projectId: activeId } = useParams();
  const { expandedIds, toggleExpanded, selectedAssetBatchId } = useAssetStore();
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = expandedIds.has(node.id);
  const isActive = activeId === node.id || selectedAssetBatchId === node.id;
  const { isDragOver, dropHandlers } = useFolderDropTarget(toUploadTarget(node));

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`${ROUTES.projects}/${node.id}`)}
        onKeyDown={(e) => e.key === "Enter" && navigate(`${ROUTES.projects}/${node.id}`)}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={cn(
          "flex items-center gap-1.5 rounded-lg py-1.5 pr-2 text-sm font-medium transition-colors cursor-pointer",
          isDragOver
            ? "bg-primary/20 ring-1 ring-inset ring-primary"
            : isActive
            ? "bg-primary/15 text-primary"
            : "text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/80"
        )}
        {...dropHandlers}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.id);
            }}
            className="flex size-4 shrink-0 items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <ChevronRight className={cn("size-3.5 transition-transform duration-200", isExpanded && "rotate-90")} />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <Folder className={cn("size-3.5 shrink-0", isActive ? "text-primary" : "text-info")} />
        <span className="truncate">{node.name}</span>
      </div>

      {hasChildren && (
        <div
          className="grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
        >
          <div className="min-h-0">
            {node.children!.map((child) => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectTree({ nodes }: { nodes: ProjectNode[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}
