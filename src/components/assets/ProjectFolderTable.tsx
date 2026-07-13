import { useNavigate } from "react-router-dom";
import { Folder, Clock } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ROUTES } from "@/constants/routes";
import type { ProjectSummary } from "@/types";

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export function ProjectFolderTable({ folders }: { folders: ProjectSummary[] }) {
  const navigate = useNavigate();

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
        {folders.map((folder) => (
          <TableRow
            key={folder.id}
            className="cursor-pointer"
            onClick={() => navigate(`${ROUTES.projects}/${folder.id}`)}
          >
            <TableCell>
              <span className="flex items-center gap-2 font-medium">
                <Folder className="size-4 text-emerald-500" />
                {folder.name}
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
        ))}
      </TableBody>
    </Table>
  );
}
