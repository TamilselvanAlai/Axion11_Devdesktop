import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AssetAssignee } from "@/types";

export function AssigneeBadge({ assignee }: { assignee: AssetAssignee }) {
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <Avatar size="sm">
        <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
          {assignee.initials}
        </AvatarFallback>
      </Avatar>
      {assignee.name}
    </span>
  );
}
