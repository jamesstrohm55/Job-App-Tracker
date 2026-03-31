import { useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { connectGmail } from "@/api/emails"

export function GmailCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const code = searchParams.get("code")
    if (!code) {
      toast.error("Gmail connection failed: no authorization code")
      navigate("/settings")
      return
    }

    const codeVerifier = sessionStorage.getItem("gmail_code_verifier") || undefined
    sessionStorage.removeItem("gmail_code_verifier")

    connectGmail(code, codeVerifier)
      .then(() => {
        toast.success("Gmail connected successfully!")
        navigate("/settings")
      })
      .catch(() => {
        toast.error("Failed to connect Gmail")
        navigate("/settings")
      })
  }, [searchParams, navigate])

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-muted-foreground">Connecting Gmail...</p>
    </div>
  )
}
