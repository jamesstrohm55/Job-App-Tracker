import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { Mail, RefreshCw, Trash2, Unplug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGmailStatus, useDisconnectGmail, useSyncEmails, useTrashRejectionEmails } from "@/hooks/use-emails"
import { getGmailAuthUrl } from "@/api/emails"

function useSyncTimer(isSyncing: boolean) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isSyncing) {
      setElapsed(0)
      intervalRef.current = setInterval(() => setElapsed((t) => t + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isSyncing])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

export function SettingsPage() {
  const { data: status, isLoading } = useGmailStatus()
  const disconnectGmail = useDisconnectGmail()
  const syncEmails = useSyncEmails()
  const trashRejections = useTrashRejectionEmails()
  const syncTimer = useSyncTimer(syncEmails.isPending)

  const handleConnectGmail = async () => {
    try {
      const { url, code_verifier } = await getGmailAuthUrl()
      sessionStorage.setItem("gmail_code_verifier", code_verifier)
      window.location.href = url
    } catch {
      alert("Failed to get Gmail auth URL. Check that Google credentials are configured.")
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* Gmail Integration */}
      <div className="rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Gmail Integration</h2>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : status?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Connected</span>
              <span className="text-sm text-muted-foreground">
                ({status.email_address})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Last synced</p>
                <p className="font-medium">
                  {status.last_sync_at
                    ? format(new Date(status.last_sync_at), "MMM d, yyyy 'at' h:mm a")
                    : "Never"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total emails synced</p>
                <p className="font-medium">{status.total_emails}</p>
              </div>
            </div>

            {!status.last_sync_at && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
                <p className="font-medium text-amber-800 dark:text-amber-200">First sync may take 2-4 minutes</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  We'll fetch all your emails from the last 15 days and classify them. After that, syncs are near-instant.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => syncEmails.mutate()}
                disabled={syncEmails.isPending}
              >
                <RefreshCw className={`h-4 w-4 ${syncEmails.isPending ? "animate-spin" : ""}`} />
                {syncEmails.isPending ? `Syncing... ${syncTimer}` : "Sync Now"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm("Trash all emails linked to rejected applications in Gmail? This moves them to Gmail's trash (auto-deleted after 30 days).")) {
                    trashRejections.mutate()
                  }
                }}
                disabled={trashRejections.isPending}
              >
                <Trash2 className="h-4 w-4" />
                {trashRejections.isPending ? "Trashing..." : "Trash Rejections"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm("Disconnect Gmail? Your synced emails will remain.")) {
                    disconnectGmail.mutate()
                  }
                }}
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </Button>
            </div>

            {trashRejections.data && (
              <p className="text-sm text-muted-foreground">
                Moved {trashRejections.data.trashed} rejection email(s) to trash.
              </p>
            )}

            {syncEmails.data && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <p><span className="font-medium">{(syncEmails.data as Record<string, number>).new_emails}</span> new emails synced</p>
                  <span className="text-xs text-muted-foreground">
                    {(syncEmails.data as Record<string, number>).sync_duration_seconds}s
                  </span>
                </div>
                {(syncEmails.data as Record<string, number>).auto_linked > 0 && (
                  <p><span className="font-medium">{(syncEmails.data as Record<string, number>).auto_linked}</span> emails auto-linked</p>
                )}
                {(syncEmails.data as Record<string, number>).auto_created > 0 && (
                  <p><span className="font-medium">{(syncEmails.data as Record<string, number>).auto_created}</span> applications auto-created</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Gmail to automatically detect job application emails and
              link them to your tracked applications.
            </p>
            <Button onClick={handleConnectGmail}>
              <Mail className="h-4 w-4" />
              Connect Gmail
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
