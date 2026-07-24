import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AssetAssignee } from "@/types";

export function AssigneeBadge({ assignee }: { assignee: AssetAssignee }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-sm" title={assignee.name}>
      <Avatar size="sm" className="shrink-0">
        <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
          {assignee.initials}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate">{assignee.name}</span>
    </span>
  );
}
