import { useEffect, useRef } from "react"
import { format } from "date-fns"
import { Reply, Trash2, Link2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { InboxItem } from "@/api/emails"

interface EmailDetailProps {
  email: InboxItem
  bodyHtml: string | null
  bodyText: string | null
  bodyLoading: boolean
  onReply: () => void
  onTrash: () => void
  onLink: () => void
}

export function EmailDetail({
  email,
  bodyHtml,
  bodyText,
  bodyLoading,
  onReply,
  onTrash,
  onLink,
}: EmailDetailProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Auto-resize iframe to content
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !bodyHtml) return

    const resizeObserver = new ResizeObserver(() => {
      if (iframe.contentDocument?.body) {
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 20 + "px"
      }
    })

    const handleLoad = () => {
      if (iframe.contentDocument?.body) {
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 20 + "px"
        resizeObserver.observe(iframe.contentDocument.body)
      }
    }

    iframe.addEventListener("load", handleLoad)
    return () => {
      iframe.removeEventListener("load", handleLoad)
      resizeObserver.disconnect()
    }
  }, [bodyHtml])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold">{email.subject}</h2>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{email.from_address}</p>
            {email.to_address && (
              <p className="text-xs text-muted-foreground">To: {email.to_address}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {email.received_at ? format(new Date(email.received_at), "MMMM d, yyyy 'at' h:mm a") : ""}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={onReply}>
              <Reply className="h-4 w-4" />
              Reply
            </Button>
            <Button variant="ghost" size="icon" onClick={onTrash} title="Trash">
              <Trash2 className="h-4 w-4" />
            </Button>
            {!email.application_id && email.is_job_related && (
              <Button variant="ghost" size="icon" onClick={onLink} title="Link to application">
                <Link2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Job badge */}
        {email.is_job_related && email.intent && (
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {email.intent.replace(/_/g, " ")}
            </span>
            {email.extracted_company && (
              <span className="text-xs text-muted-foreground">
                Company: {email.extracted_company}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {bodyLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">Loading email...</p>
          </div>
        ) : bodyHtml ? (
          <iframe
            ref={iframeRef}
            sandbox=""
            srcDoc={bodyHtml}
            className="w-full border-0"
            style={{ minHeight: 200 }}
          />
        ) : bodyText ? (
          <pre className="whitespace-pre-wrap text-sm">{bodyText}</pre>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No content available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
