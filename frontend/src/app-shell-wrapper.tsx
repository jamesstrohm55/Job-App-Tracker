import { useEffect, useState } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { Briefcase } from "lucide-react"
import { AppShell } from "./components/layout/app-shell"
import { BoardPage } from "./pages/board"
import { ApplicationsPage } from "./pages/applications"
import { ContactsPage } from "./pages/contacts"
import { EmailsPage } from "./pages/emails"
import { DashboardPage } from "./pages/dashboard"
import { SettingsPage } from "./pages/settings"
import { ApplicationDetailPage } from "./pages/application-detail"
import { GmailCallbackPage } from "./pages/gmail-callback"
import { getMe, logout as logoutApi } from "./api/auth"
import { getAccessToken, setAccessToken } from "./api/client"
import type { User } from "./types"
import type { TokenResponse } from "./types"
import axios from "axios"

export function AppShellWrapper() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const restoreSession = async () => {
      // If we already have an access token, just fetch the user
      if (getAccessToken()) {
        try {
          const me = await getMe()
          setUser(me)
        } catch {
          setAccessToken(null)
          localStorage.removeItem("refresh_token")
        }
        setLoading(false)
        return
      }

      // Try to restore from refresh token
      const refreshToken = localStorage.getItem("refresh_token")
      if (refreshToken) {
        try {
          const apiBase = import.meta.env.VITE_API_URL || "/api/v1"
          const { data } = await axios.post<TokenResponse>(`${apiBase}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          setAccessToken(data.access_token)
          localStorage.setItem("refresh_token", data.refresh_token)
          const me = await getMe()
          setUser(me)
        } catch {
          setAccessToken(null)
          localStorage.removeItem("refresh_token")
        }
      }
      setLoading(false)
    }

    restoreSession()
  }, [])

  const handleLogout = async () => {
    try {
      await logoutApi()
    } finally {
      setAccessToken(null)
      localStorage.removeItem("refresh_token")
      setUser(null)
      navigate("/login")
    }
  }

  // Smooth transition: show loading splash, then fade into app
  const [showApp, setShowApp] = useState(false)
  const [splashExiting, setSplashExiting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      // Brief delay for splash exit animation
      setSplashExiting(true)
      const timer = setTimeout(() => setShowApp(true), 400)
      return () => clearTimeout(timer)
    }
  }, [loading, user])

  // Gmail callback must render as soon as session is restored (skip splash animation)
  const isGmailCallback = window.location.pathname.includes("/settings/gmail/callback")
  if (isGmailCallback) {
    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-muted-foreground">Restoring session...</p>
        </div>
      )
    }
    return (
      <Routes>
        <Route path="settings/gmail/callback" element={<GmailCallbackPage />} />
        <Route path="*" element={<GmailCallbackPage />} />
      </Routes>
    )
  }

  if (loading || (!showApp && user)) {
    return (
      <div className={`flex min-h-screen items-center justify-center bg-background transition-opacity duration-300 ${splashExiting ? "opacity-0" : "opacity-100"}`}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 blur-xl animate-pulse" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
              <Briefcase className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent animate-gradient-x">
            HireTrackr
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <Routes>
      <Route element={<AppShell user={user} onLogout={handleLogout} />}>
        <Route index element={<Navigate to="/board" replace />} />
        <Route path="board" element={<BoardPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="emails" element={<EmailsPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/board" replace />} />
      </Route>
    </Routes>
  )
}
