import { Navigate } from "react-router-dom"
import { getAccessToken } from "@/api/client"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = getAccessToken()
  const refreshToken = localStorage.getItem("refresh_token")

  if (!token && !refreshToken) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
