import { format } from "date-fns"
import { Mail, RefreshCw, Trash2, Unplug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGmailStatus, useDisconnectGmail, useSyncEmails, useTrashRejectionEmails } from "@/hooks/use-emails"
import { getGmailAuthUrl } from "@/api/emails"

export function SettingsPage() {
  const { data: status, isLoading } = useGmailStatus()
  const disconnectGmail = useDisconnectGmail()
  const syncEmails = useSyncEmails()
  const trashRejections = useTrashRejectionEmails()

  const handleConnectGmail = async () => {
    try {
      const url = await getGmailAuthUrl()
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

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => syncEmails.mutate()}
                disabled={syncEmails.isPending}
              >
                <RefreshCw className={`h-4 w-4 ${syncEmails.isPending ? "animate-spin" : ""}`} />
                {syncEmails.isPending ? "Syncing..." : "Sync Now"}
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
                  <p><span className="font-medium">{syncEmails.data.new_emails}</span> new emails synced</p>
                  <span className="text-xs text-muted-foreground">
                    {syncEmails.data.sync_duration_seconds}s
                  </span>
                </div>
                {syncEmails.data.auto_created > 0 && (
                  <p><span className="font-medium">{syncEmails.data.auto_created}</span> applications auto-created</p>
                )}
                {syncEmails.data.auto_linked > 0 && (
                  <p><span className="font-medium">{syncEmails.data.auto_linked}</span> emails auto-linked</p>
                )}
                {syncEmails.data.stage_updates > 0 && (
                  <p><span className="font-medium">{syncEmails.data.stage_updates}</span> application stages updated</p>
                )}
                {syncEmails.data.timeline_events > 0 && (
                  <p><span className="font-medium">{syncEmails.data.timeline_events}</span> timeline events added</p>
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
