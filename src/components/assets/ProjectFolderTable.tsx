import { useNavigate } from "react-router-dom";
import { Folder, Clock, Loader2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { useAssetStore } from "@/store";
import { findAncestorIds } from "@/utils/assetPath";
import type { ProjectSummary } from "@/types";

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export function ProjectFolderTable({ folders }: { folders: ProjectSummary[] }) {
  const navigate = useNavigate();
  const { projectTree, expandAncestors, uploadingBatches } = useAssetStore();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Assets</TableHead>
          <TableHead>ETA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {folders.map((folder) => {
          const uploading = uploadingBatches[folder.id];
          return (
          <TableRow
            key={folder.id}
            className="animate-in fade-in duration-300 cursor-pointer"
            onClick={() => {
              // Reveal this folder in the sidebar tree the same way clicking an asset does —
              // expand every ancestor so the newly-active node isn't hidden under a collapsed
              // parent, instead of relying on the route param to highlight it.
              expandAncestors(findAncestorIds(projectTree, folder.id) ?? [folder.id]);
              navigate(`${ROUTES.projects}/${folder.id}`);
            }}
          >
            <TableCell>
              <span className="flex items-center gap-2 font-medium">
                <Folder className="size-4 text-emerald-500" />
                {folder.name}
                {uploading && (
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      uploading.phase === "uploading" ? "text-primary" : "text-violet-400"
                    )}
                  >
                    <Loader2 className="size-3 animate-spin" />
                    {uploading.phase === "uploading" ? "Uploading…" : "Processing…"}
                  </span>
                )}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">{folder.assetCount}</TableCell>
            <TableCell className="text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-amber-500" />
                {formatDate(folder.dueDate)}
              </span>
            </TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
