import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster, toast } from "sonner"
import { useEffect } from "react"
import { ErrorBoundary } from "./components/ui/error-boundary"
import { AppShellWrapper } from "./app-shell-wrapper"
import { LoginPage } from "./pages/login"
import { PrivacyPage } from "./pages/privacy"
import { TermsPage } from "./pages/terms"
import { useUIStore } from "./stores/ui-store"
import { loginWithGoogle } from "./api/auth"
import { setAccessToken } from "./api/client"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ""

export default function App() {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={import.meta.env.VITE_BASE_PATH || "/"}>
            <Routes>
              <Route path="/login" element={<LoginPageWrapper />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/*" element={<AppShellWrapper />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" richColors />
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  )
}

function LoginPageWrapper() {
  const navigate = useNavigate()

  const handleGoogleLogin = async (credential: string) => {
    try {
      const result = await loginWithGoogle(credential)
      setAccessToken(result.access_token)
      localStorage.setItem("refresh_token", result.refresh_token)
      navigate("/board")
    } catch {
      toast.error("Login failed. Please try again.")
    }
  }

  return <LoginPage onGoogleLogin={handleGoogleLogin} />
}
