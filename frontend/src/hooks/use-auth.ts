import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getMe, loginWithGoogle, logout as logoutApi } from "@/api/auth"
import { getAccessToken, setAccessToken } from "@/api/client"
import type { User } from "@/types"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // On mount, check if we have a refresh token and try to restore session
  useEffect(() => {
    const token = getAccessToken()
    const refreshToken = localStorage.getItem("refresh_token")

    if (token || refreshToken) {
      getMe()
        .then(setUser)
        .catch(() => {
          setAccessToken(null)
          localStorage.removeItem("refresh_token")
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const handleGoogleLogin = useCallback(
    async (code: string) => {
      const result = await loginWithGoogle(code)
      setAccessToken(result.access_token)
      localStorage.setItem("refresh_token", result.refresh_token)
      setUser(result.user)
      navigate("/board")
    },
    [navigate]
  )

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } finally {
      setAccessToken(null)
      localStorage.removeItem("refresh_token")
      setUser(null)
      navigate("/login")
    }
  }, [navigate])

  return { user, loading, handleGoogleLogin, logout }
}
