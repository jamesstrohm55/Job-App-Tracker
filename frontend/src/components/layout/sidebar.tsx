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
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        {sidebarOpen ? (
          <h1 className="text-lg font-semibold text-sidebar-foreground">
            Job Tracker
          </h1>
        ) : (
          <Briefcase className="mx-auto h-5 w-5 text-sidebar-foreground" />
        )}
      </div>

      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-0 w-full border-t border-sidebar-border p-2">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  )
}
