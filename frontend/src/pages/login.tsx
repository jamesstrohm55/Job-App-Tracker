import { GoogleLogin } from "@react-oauth/google"
import { Briefcase } from "lucide-react"

interface LoginPageProps {
  onGoogleLogin: (code: string) => Promise<void>
}

export function LoginPage({ onGoogleLogin }: LoginPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-sm space-y-8 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Briefcase className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Job Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Track your job applications in one place
          </p>
        </div>

        <div className="flex justify-center">
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
    </div>
  )
}
