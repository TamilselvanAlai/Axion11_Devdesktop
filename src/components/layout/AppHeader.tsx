import { useState } from "react";
import { ChevronDown, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LocalSyncStatus } from "@/components/shared/LocalSyncStatus";
import { NotificationsMenu } from "@/components/shared/NotificationsMenu";
import { UserSettingsDialog } from "@/components/shared/UserSettingsDialog";
import { GlobalSearch } from "@/components/shared/GlobalSearch";
import { useUser } from "@/hooks/useUser";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader({ hideSearch }: { hideSearch?: boolean }) {
  const user = useUser();
  const { logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <div className="flex min-w-0 flex-1 justify-center">
        {!hideSearch && <GlobalSearch />}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 text-xs">
        <LocalSyncStatus />

        <div className="mx-0.5 h-3.5 w-px bg-border" />

        <NotificationsMenu />

        <div className="mx-0.5 h-3.5 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-white/5 focus-visible:ring-3 focus-visible:ring-ring/50">
            <Avatar className="size-5 border border-primary/40 bg-primary/20">
              <AvatarFallback className="bg-transparent text-[9px] font-semibold text-primary">
                {user?.initials ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-xs font-medium sm:inline">{user?.name ?? "Guest"}</span>
            <ChevronDown className="size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-1.5 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
              <Settings className="size-4" /> User Settings
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => logout()}>
              <LogOut className="size-4" /> Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <UserSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
