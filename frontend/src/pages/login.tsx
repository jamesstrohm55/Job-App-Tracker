import { GoogleLogin } from "@react-oauth/google"
import { Briefcase, Mail, BarChart3, KanbanSquare } from "lucide-react"

interface LoginPageProps {
  onGoogleLogin: (code: string) => Promise<void>
}

export function LoginPage({ onGoogleLogin }: LoginPageProps) {
  return (
    <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Aurora animated background — always dark */}
      <div className="aurora-bg !bg-none" style={{ background: "linear-gradient(220deg, #0f172a, #1e1b4b, #0c1445, #1e3a5f, #0f172a)", backgroundSize: "400% 400%", animation: "aurora-flow 12s ease-in-out infinite" }} />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]" />

      <div className="relative z-10 mx-auto w-full max-w-md px-4">
        {/* Logo + Title */}
        <div className="animate-fade-in-up mb-8 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
          </div>

          <h1 className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent animate-gradient-x">
            HireTrackr
          </h1>

          <p className="animate-fade-in-up-delay-1 text-center text-sm text-slate-400">
            Your job search command center
          </p>
        </div>

        {/* Glass card — always dark glass */}
        <div className="animate-fade-in-up-delay-2 rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl shadow-blue-500/10 backdrop-blur-2xl">
          {/* Feature pills */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-blue-800/50 bg-blue-950/60 px-3 py-1 text-xs font-medium text-blue-300 backdrop-blur-sm">
              <KanbanSquare className="h-3 w-3" /> Kanban Board
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-indigo-800/50 bg-indigo-950/60 px-3 py-1 text-xs font-medium text-indigo-300 backdrop-blur-sm">
              <Mail className="h-3 w-3" /> Email Client
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-violet-800/50 bg-violet-950/60 px-3 py-1 text-xs font-medium text-violet-300 backdrop-blur-sm">
              <BarChart3 className="h-3 w-3" /> Analytics
            </span>
          </div>

          {/* Sign in */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-medium text-slate-200">Sign in to get started</p>
            <GoogleLogin
              onSuccess={(response) => {
                if (response.credential) {
                  onGoogleLogin(response.credential)
                }
              }}
              onError={() => {
                console.error("Google login failed")
              }}
              theme="outline"
              size="large"
              width="320"
            />
          </div>
        </div>

        {/* Footer */}
        <p className="animate-fade-in-up-delay-3 mt-6 text-center text-xs text-slate-500">
          Built with FastAPI + React + Gmail API
        </p>
      </div>
    </div>
  )
}
