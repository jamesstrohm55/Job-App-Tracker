import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "./components/layout/app-shell"
import { BoardPage } from "./pages/board"
import { ApplicationsPage } from "./pages/applications"
import { ContactsPage } from "./pages/contacts"
import { EmailsPage } from "./pages/emails"
import { DashboardPage } from "./pages/dashboard"
import { SettingsPage } from "./pages/settings"
import { ApplicationDetailPage } from "./pages/application-detail"

export function AppShellWrapper() {
  // TODO: wire up real auth once Google OAuth is configured
  const mockUser = {
    id: "1",
    email: "user@example.com",
    name: "Demo User",
    picture_url: null,
  }

  return (
    <Routes>
      <Route element={<AppShell user={mockUser} onLogout={() => {}} />}>
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
