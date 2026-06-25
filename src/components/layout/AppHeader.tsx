import { Search, Bell, ChevronDown, Cloud, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/hooks/useUser";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const user = useUser();
  const { logout } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search assets, batches, SKUs…"
          className="h-9 w-full rounded-lg border border-input bg-transparent pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="hidden items-center gap-1.5 text-emerald-500 sm:flex">
          <Cloud className="size-4" /> Cloud Connected
        </span>
        <span className="hidden items-center gap-1.5 text-primary sm:flex">
          <RefreshCw className="size-4" /> Syncing
        </span>
        <button
          aria-label="Notifications"
          className="relative flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{user?.initials ?? "?"}</AvatarFallback>
            </Avatar>
            <span className="hidden font-medium sm:inline">{user?.name ?? "Guest"}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => logout()}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
