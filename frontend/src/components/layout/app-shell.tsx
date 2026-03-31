import { Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import type { User } from "@/types"

interface AppShellProps {
  user: User | null
  onLogout: () => void
}

export function AppShell({ user, onLogout }: AppShellProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

  return (
    <div className="app-grid min-h-screen bg-background animate-fade-in">
      <Sidebar />
      <div
        className={cn(
          "relative transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-16"
        )}
      >
        <Header user={user} onLogout={onLogout} />
        <main className="page-enter p-4 md:p-6">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
