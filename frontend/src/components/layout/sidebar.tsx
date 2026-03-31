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
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border/30 bg-sidebar/90 backdrop-blur-[2em] transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <Briefcase className="h-3.5 w-3.5 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-lg font-bold tracking-tight text-transparent">
              HireTrackr
            </h1>
          </div>
        ) : (
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
            <Briefcase className="h-3.5 w-3.5 text-white" />
          </div>
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-out",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5"
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
