import { useState } from "react"
import { format } from "date-fns"
import { Link2, Link2Off, Mail, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useEmails,
  useEmailSuggestions,
  useGmailStatus,
  useLinkEmail,
  useSyncEmails,
  useUnlinkEmail,
} from "@/hooks/use-emails"
import { useApplications } from "@/hooks/use-applications"

export function EmailsPage() {
  const [filter, setFilter] = useState<"all" | "linked" | "unlinked">("all")
  const [linkDialogEmail, setLinkDialogEmail] = useState<string | null>(null)

  const { data: gmailStatus } = useGmailStatus()
  const syncEmails = useSyncEmails()

  const { data: emailData, isLoading } = useEmails({
    linked: filter === "linked" ? true : filter === "unlinked" ? false : undefined,
  })

  const { data: suggestions } = useEmailSuggestions()
  const { data: applications } = useApplications({ size: 100 })

  const linkEmail = useLinkEmail()
  const unlinkEmail = useUnlinkEmail()

  const handleLink = (emailId: string, applicationId: string) => {
    linkEmail.mutate({ emailId, applicationId })
    setLinkDialogEmail(null)
  }

  if (!gmailStatus?.connected) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Emails</h1>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Mail className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            Connect Gmail in Settings to start syncing emails.
          </p>
          <Button variant="outline" onClick={() => (window.location.href = "/settings")}>
            Go to Settings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Emails</h1>
        <Button
          size="sm"
          onClick={() => syncEmails.mutate()}
          disabled={syncEmails.isPending}
        >
          <RefreshCw className={`h-4 w-4 ${syncEmails.isPending ? "animate-spin" : ""}`} />
          {syncEmails.isPending ? "Syncing..." : "Sync"}
        </Button>
      </div>

      {/* Suggestions banner */}
      {suggestions && suggestions.suggestions.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {suggestions.suggestions.length} unlinked email(s) may be job-related
          </p>
          <div className="mt-2 space-y-2">
            {suggestions.suggestions.slice(0, 3).map((s) => (
              <div
                key={s.email.id}
                className="flex items-center justify-between rounded-md bg-background p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.email.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.matched_company
                      ? `Likely: ${s.matched_company} (${s.confidence})`
                      : `Job email detected (${s.confidence})`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLinkDialogEmail(s.email.id)}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Link
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="w-40"
        >
          <option value="all">All emails</option>
          <option value="linked">Linked</option>
          <option value="unlinked">Unlinked</option>
        </Select>
        <span className="text-sm text-muted-foreground">
          {emailData?.total ?? 0} email(s)
        </span>
      </div>

      {/* Email list */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !emailData?.items.length ? (
        <p className="py-10 text-center text-muted-foreground">
          No emails found. Click "Sync" to fetch from Gmail.
        </p>
      ) : (
        <div className="space-y-2">
          {emailData.items.map((email) => (
            <div
              key={email.id}
              className="flex items-center gap-4 rounded-lg border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{email.subject}</p>
                  {email.is_auto_linked && (
                    <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                      auto-linked
                    </span>
                  )}
                  {email.application_id && !email.is_auto_linked && (
                    <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      linked
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{email.from_address}</p>
                {email.snippet && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{email.snippet}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(email.received_at), "MMM d")}
                </span>
                {email.application_id ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => unlinkEmail.mutate(email.id)}
                    title="Unlink"
                  >
                    <Link2Off className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setLinkDialogEmail(email.id)}
                    title="Link to application"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link dialog */}
      <Dialog
        open={!!linkDialogEmail}
        onOpenChange={(open) => !open && setLinkDialogEmail(null)}
      >
        <DialogContent onClose={() => setLinkDialogEmail(null)}>
          <DialogHeader>
            <DialogTitle>Link to Application</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {applications?.items.map((app) => (
              <button
                key={app.id}
                onClick={() => linkDialogEmail && handleLink(linkDialogEmail, app.id)}
                className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent"
              >
                <div>
                  <p className="text-sm font-medium">{app.company}</p>
                  <p className="text-xs text-muted-foreground">{app.position}</p>
                </div>
              </button>
            ))}
            {!applications?.items.length && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No applications to link to.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
