import { BrowserRouter, Route, Routes } from "react-router-dom"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect } from "react"
import { AppShellWrapper } from "./app-shell-wrapper"
import { LoginPage } from "./pages/login"
import { useUIStore } from "./stores/ui-store"

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
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPageWrapper />} />
            <Route path="/*" element={<AppShellWrapper />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  )
}

function LoginPageWrapper() {
  const handleGoogleLogin = async (credential: string) => {
    console.log("Google login with credential:", credential.substring(0, 20) + "...")
  }

  return <LoginPage onGoogleLogin={handleGoogleLogin} />
}
