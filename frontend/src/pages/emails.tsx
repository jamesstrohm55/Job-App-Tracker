import { useState, useEffect } from "react"
import { RefreshCw, Search, PenSquare, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmailList } from "@/components/emails/email-list"
import { EmailDetail } from "@/components/emails/email-detail"
import { ComposeDialog } from "@/components/emails/compose-dialog"
import {
  getInbox,
  getEmailBody,
  syncAllEmails,
  composeEmail,
  replyToEmail,
  trashEmail,
  markEmailRead,
  type InboxItem,
  type InboxResponse,
} from "@/api/emails"
import { useGmailStatus } from "@/hooks/use-emails"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useQueryClient } from "@tanstack/react-query"

const TABS = [
  { key: "inbox", label: "Inbox" },
  { key: "job", label: "Job Emails" },
  { key: "application_confirmed", label: "Applications" },
  { key: "interview", label: "Interviews" },
  { key: "rejection", label: "Rejections" },
  { key: "sent", label: "Sent" },
] as const

export function EmailsPage() {
  const { data: gmailStatus } = useGmailStatus()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<string>("inbox")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [inboxData, setInboxData] = useState<InboxResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const [selectedEmail, setSelectedEmail] = useState<InboxItem | null>(null)
  const [bodyHtml, setBodyHtml] = useState<string | null>(null)
  const [bodyText, setBodyText] = useState<string | null>(null)
  const [bodyLoading, setBodyLoading] = useState(false)

  const [composeOpen, setComposeOpen] = useState(false)
  const [composeSending, setComposeSending] = useState(false)
  const [replyTo, setReplyTo] = useState<{ to: string; subject: string } | null>(null)

  // Fetch inbox
  useEffect(() => {
    if (!gmailStatus?.connected) return
    setLoading(true)
    const params: Record<string, string | number> = { page, size: 50 }

    if (activeTab === "inbox") {
      params.label = "inbox"
    } else if (activeTab === "job") {
      params.label = "job"
    } else if (activeTab === "sent") {
      params.label = "sent"
    } else {
      // Category filter (application_confirmed, interview, rejection)
      params.label = "all"
      params.category = activeTab
    }

    if (search) params.search = search

    getInbox(params as Parameters<typeof getInbox>[0])
      .then(setInboxData)
      .catch(() => toast.error("Failed to load emails"))
      .finally(() => setLoading(false))
  }, [activeTab, page, search, gmailStatus?.connected])

  // Fetch body when email selected
  useEffect(() => {
    if (!selectedEmail) {
      setBodyHtml(null)
      setBodyText(null)
      return
    }
    setBodyLoading(true)
    setBodyHtml(null)
    setBodyText(null)

    // Mark as read
    if (!selectedEmail.is_read) {
      markEmailRead(selectedEmail.id).catch(() => {})
      selectedEmail.is_read = true
    }

    getEmailBody(selectedEmail.id)
      .then((data) => {
        setBodyHtml(data.body_html)
        setBodyText(data.body_text)
      })
      .catch(() => toast.error("Failed to load email body"))
      .finally(() => setBodyLoading(false))
  }, [selectedEmail?.id])

  const handleSync = () => {
    setSyncing(true)
    syncAllEmails()
      .then((result) => {
        toast.success(`Synced ${result.new_emails} emails (${result.sync_duration_seconds}s)`)
        // Refresh inbox
        setPage(1)
        queryClient.invalidateQueries({ queryKey: ["pending-actions"] })
        queryClient.invalidateQueries({ queryKey: ["board"] })
        queryClient.invalidateQueries({ queryKey: ["applications"] })
        // Re-fetch current tab
        const params: Record<string, string | number> = { page: 1, size: 50 }
        if (activeTab === "inbox") params.label = "inbox"
        else if (activeTab === "job") params.label = "job"
        else if (activeTab === "sent") params.label = "sent"
        else { params.label = "all"; params.category = activeTab }
        if (search) params.search = search
        getInbox(params as Parameters<typeof getInbox>[0]).then(setInboxData)
      })
      .catch(() => toast.error("Sync failed"))
      .finally(() => setSyncing(false))
  }

  const handleCompose = (to: string, subject: string, body: string) => {
    setComposeSending(true)
    composeEmail(to, subject, body)
      .then(() => {
        toast.success("Email sent!")
        setComposeOpen(false)
        setReplyTo(null)
      })
      .catch(() => toast.error("Failed to send"))
      .finally(() => setComposeSending(false))
  }

  const handleReply = () => {
    if (!selectedEmail) return
    setReplyTo({
      to: selectedEmail.from_address,
      subject: selectedEmail.subject.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
    })
    setComposeOpen(true)
  }

  const handleReplySubmit = (_to: string, _subject: string, body: string) => {
    if (!selectedEmail) return
    setComposeSending(true)
    replyToEmail(selectedEmail.id, body)
      .then(() => {
        toast.success("Reply sent!")
        setComposeOpen(false)
        setReplyTo(null)
      })
      .catch(() => toast.error("Failed to send reply"))
      .finally(() => setComposeSending(false))
  }

  const handleTrash = () => {
    if (!selectedEmail) return
    trashEmail(selectedEmail.id)
      .then(() => {
        toast.success("Email trashed")
        setSelectedEmail(null)
        // Remove from current list
        if (inboxData) {
          setInboxData({
            ...inboxData,
            items: inboxData.items.filter((e) => e.id !== selectedEmail.id),
            total: inboxData.total - 1,
          })
        }
      })
      .catch(() => toast.error("Failed to trash"))
  }

  if (!gmailStatus?.connected) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Email</h1>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Mail className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Connect Gmail in Settings to use the email client.</p>
          <Button variant="outline" onClick={() => (window.location.href = "/settings")}>
            Go to Settings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col -mx-6 -mb-6">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Button size="sm" onClick={() => { setReplyTo(null); setComposeOpen(true) }}>
          <PenSquare className="h-4 w-4" />
          Compose
        </Button>
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          {syncing ? "Syncing..." : "Sync"}
        </Button>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border px-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); setSelectedEmail(null) }}
            className={cn(
              "border-b-2 px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Email list */}
        <div className="w-96 shrink-0 overflow-y-auto border-r border-border">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : inboxData ? (
            <>
              <EmailList
                emails={inboxData.items}
                selectedId={selectedEmail?.id ?? null}
                onSelect={setSelectedEmail}
              />
              {inboxData.total > inboxData.size && (
                <div className="flex items-center justify-between border-t border-border p-2">
                  <span className="text-xs text-muted-foreground">
                    {(page - 1) * inboxData.size + 1}-{Math.min(page * inboxData.size, inboxData.total)} of {inboxData.total}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)} className="h-6 text-xs">Prev</Button>
                    <Button size="sm" variant="ghost" disabled={page * inboxData.size >= inboxData.total}
                      onClick={() => setPage((p) => p + 1)} className="h-6 text-xs">Next</Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Reading pane */}
        <div className="flex-1 overflow-hidden">
          {selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              bodyHtml={bodyHtml}
              bodyText={bodyText}
              bodyLoading={bodyLoading}
              onReply={handleReply}
              onTrash={handleTrash}
              onLink={() => {}}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">Select an email to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose dialog */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSend={replyTo ? handleReplySubmit : handleCompose}
        loading={composeSending}
        replyTo={replyTo?.to}
        replySubject={replyTo?.subject}
      />
    </div>
  )
}
