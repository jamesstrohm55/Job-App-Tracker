import { useEffect, useState } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"
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
          const { data } = await axios.post<TokenResponse>("/api/v1/auth/refresh", {
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
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
        <Route path="settings/gmail/callback" element={<GmailCallbackPage />} />
        <Route path="*" element={<Navigate to="/board" replace />} />
      </Route>
    </Routes>
  )
}
