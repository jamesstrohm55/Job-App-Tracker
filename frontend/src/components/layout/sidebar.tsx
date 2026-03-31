import { Link, useLocation } from "react-router-dom"
import {
  BarChart3,
  Briefcase,
  KanbanSquare,
  Mail,
  Settings,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"

const navItems = [
  { label: "Board", icon: KanbanSquare, path: "/board" },
  { label: "Applications", icon: Briefcase, path: "/applications" },
  { label: "Contacts", icon: Users, path: "/contacts" },
  { label: "Emails", icon: Mail, path: "/emails" },
  { label: "Dashboard", icon: BarChart3, path: "/dashboard" },
]

export function Sidebar() {
  const location = useLocation()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen p-3 transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex h-full flex-col rounded-[1.75rem] border border-sidebar-border bg-sidebar/95 px-2 py-3 shadow-[0_24px_48px_rgba(2,8,23,0.22)] backdrop-blur-xl">
        <div className="flex h-16 items-center px-2">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-cyan-950/30">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-sidebar-foreground/55">
                  HireTrackr
                </p>
                <h1 className="text-base font-semibold tracking-tight text-sidebar-foreground">
                  Control Center
                </h1>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-cyan-950/30">
              <Briefcase className="h-4 w-4" />
            </div>
          )}
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200 ease-out",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                    : "text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                    isActive ? "bg-white/10" : "bg-transparent"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                </span>
                {sidebarOpen && (
                  <div className="min-w-0">
                    <p>{item.label}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/45">
                      Workspace
                    </p>
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-sidebar-border px-1 pt-3">
          <Link
            to="/settings"
            className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-sidebar-foreground/72 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <Settings className="h-4 w-4 shrink-0" />
            </span>
            {sidebarOpen && (
              <div>
                <p>Settings</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/45">
                  Preferences
                </p>
              </div>
            )}
          </Link>
        </div>
      </div>
    </aside>
  )
}
