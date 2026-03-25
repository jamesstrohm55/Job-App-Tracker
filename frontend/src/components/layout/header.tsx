import { LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react"
import { useUIStore } from "@/stores/ui-store"
import type { User } from "@/types"

interface HeaderProps {
  user: User | null
  onLogout: () => void
}

export function Header({ user, onLogout }: HeaderProps) {
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <button
        onClick={toggleSidebar}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" />
        )}
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>

        {user && (
          <div className="flex items-center gap-2">
            {user.picture_url && (
              <img
                src={user.picture_url}
                alt={user.name}
                className="h-7 w-7 rounded-full"
              />
            )}
            <span className="text-sm font-medium">{user.name}</span>
            <button
              onClick={onLogout}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
