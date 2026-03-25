import { create } from "zustand"

interface UIState {
  sidebarOpen: boolean
  theme: "light" | "dark"
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleTheme: () => void
  setTheme: (theme: "light" | "dark") => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: (localStorage.getItem("theme") as "light" | "dark") || "light",
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "light" ? "dark" : "light"
      localStorage.setItem("theme", next)
      document.documentElement.classList.toggle("dark", next === "dark")
      return { theme: next }
    }),
  setTheme: (theme) => {
    localStorage.setItem("theme", theme)
    document.documentElement.classList.toggle("dark", theme === "dark")
    set({ theme })
  },
}))
