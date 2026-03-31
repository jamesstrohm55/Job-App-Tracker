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
    <header className="sticky top-0 z-30 px-3 py-3 md:px-6">
      <div className="surface-panel flex h-16 items-center justify-between rounded-2xl px-3 backdrop-blur-xl md:px-5">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="cursor-pointer rounded-xl border border-transparent p-2 text-muted-foreground transition-all duration-200 ease-out hover:border-border hover:bg-accent hover:text-accent-foreground"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>

          <div className="hidden md:block">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Job Search OS
            </p>
            <p className="text-sm font-semibold text-foreground">Track pipeline, email, and momentum in one place</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={toggleTheme}
            className="cursor-pointer rounded-xl border border-transparent p-2 text-muted-foreground transition-all duration-200 ease-out hover:border-border hover:bg-accent hover:text-accent-foreground"
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>

          {user && (
            <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-background-elevated/80 px-2 py-2 md:gap-3 md:px-3">
              {user.picture_url && (
                <img
                  src={user.picture_url}
                  alt={user.name}
                  className="h-8 w-8 rounded-xl object-cover"
                />
              )}
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Signed In
                </p>
              </div>
              <button
                onClick={onLogout}
                className="cursor-pointer rounded-xl border border-transparent p-2 text-muted-foreground transition-all duration-200 ease-out hover:border-border hover:bg-accent hover:text-accent-foreground"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
