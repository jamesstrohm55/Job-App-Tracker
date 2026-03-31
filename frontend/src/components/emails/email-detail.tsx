import { useCallback, useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { Link2, Mail, Reply, Trash2 } from "lucide-react"
import type { InboxItem } from "@/api/emails"
import { Button } from "@/components/ui/button"

interface EmailDetailProps {
  email: InboxItem
  bodyHtml: string | null
  bodyText: string | null
  bodyLoading: boolean
  onReply: () => void
  onTrash: () => void
  onLink: () => void
}

function wrapHtmlForIframe(html: string, isDark: boolean): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <base target="_blank">
      <style>
        body {
          margin: 0;
          padding: 16px;
          font-family: -apple-system, system-ui, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          word-wrap: break-word;
          overflow-wrap: break-word;
          background-color: ${isDark ? "#1f2937" : "#ffffff"};
          color: ${isDark ? "#f3f4f6" : "#111827"};
        }
        img { max-width: 100%; height: auto; }
        a { color: ${isDark ? "#7dd3fc" : "#0369a1"}; }
        table { max-width: 100% !important; }
        pre { white-space: pre-wrap; }
        * { max-width: 100% !important; }
      </style>
    </head>
    <body>
      ${html}
      <script>
        function reportHeight() {
          var h = document.documentElement.scrollHeight;
          window.parent.postMessage({ type: 'iframe-height', height: h }, '*');
        }
        window.addEventListener('load', function() {
          reportHeight();
          setTimeout(reportHeight, 500);
          setTimeout(reportHeight, 1500);
        });
        new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true });
      </script>
    </body>
    </html>
  `
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
  const isDark = document.documentElement.classList.contains("dark")
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(400)

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === "iframe-height" && typeof event.data.height === "number") {
      setIframeHeight(Math.max(event.data.height, 200))
    }
  }, [])

  useEffect(() => {
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [handleMessage])

  useEffect(() => {
    setIframeHeight(400)
  }, [email.id])

  return (
    <div className="flex h-full flex-col bg-background-elevated animate-slide-in-right">
      <div className="border-b border-border/80 bg-background-elevated px-5 py-4">
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

        {email.is_job_related && email.intent && (
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
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

      <div className="flex-1 overflow-y-auto">
        {bodyLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">Loading email...</p>
          </div>
        ) : bodyHtml ? (
          <iframe
            ref={iframeRef}
            sandbox="allow-scripts allow-popups"
            srcDoc={wrapHtmlForIframe(bodyHtml, isDark)}
            className="w-full border-0 bg-background-elevated"
            style={{ height: iframeHeight }}
          />
        ) : bodyText ? (
          <pre className="whitespace-pre-wrap bg-background-elevated px-5 py-4 text-sm">{bodyText}</pre>
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
