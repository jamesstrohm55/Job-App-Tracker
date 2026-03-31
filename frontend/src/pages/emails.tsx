import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { CheckSquare, Mail, MailOpen, PenSquare, RefreshCw, Search, Trash2, X } from "lucide-react"
import {
  batchEmailAction,
  composeEmail,
  getEmailBody,
  getInbox,
  markEmailRead,
  replyToEmail,
  syncAllEmails,
  trashEmail,
  type InboxItem,
  type InboxResponse,
} from "@/api/emails"
import { ComposeDialog } from "@/components/emails/compose-dialog"
import { EmailDetail } from "@/components/emails/email-detail"
import { EmailList } from "@/components/emails/email-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGmailStatus } from "@/hooks/use-emails"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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
  const [syncElapsed, setSyncElapsed] = useState(0)
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<InboxItem | null>(null)
  const [bodyHtml, setBodyHtml] = useState<string | null>(null)
  const [bodyText, setBodyText] = useState<string | null>(null)
  const [bodyLoading, setBodyLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeSending, setComposeSending] = useState(false)
  const [replyTo, setReplyTo] = useState<{ to: string; subject: string } | null>(null)

  useEffect(() => {
    if (syncing) {
      setSyncElapsed(0)
      syncIntervalRef.current = setInterval(() => setSyncElapsed((time) => time + 1), 1000)
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
    }

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [syncing])

  const syncTimerText = syncElapsed >= 60
    ? `${Math.floor(syncElapsed / 60)}m ${syncElapsed % 60}s`
    : `${syncElapsed}s`

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (!inboxData) return
    if (selectedIds.size === inboxData.items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(inboxData.items.map((email) => email.id)))
    }
  }

  const handleBatch = async (action: "mark_read" | "mark_unread" | "trash") => {
    if (selectedIds.size === 0) return
    setBatchLoading(true)
    try {
      const result = await batchEmailAction(Array.from(selectedIds), action)
      toast.success(`${result.affected} email(s) updated`)
      setSelectedIds(new Set())
      const params: Record<string, string | number> = { page, size: 50 }
      if (activeTab === "inbox") params.label = "inbox"
      else if (activeTab === "job") params.label = "job"
      else if (activeTab === "sent") params.label = "sent"
      else {
        params.label = "all"
        params.category = activeTab
      }
      if (search) params.search = search
      getInbox(params as Parameters<typeof getInbox>[0]).then(setInboxData)
    } catch {
      toast.error("Batch action failed")
    } finally {
      setBatchLoading(false)
    }
  }

  useEffect(() => {
    if (!gmailStatus?.connected) return
    setLoading(true)
    const params: Record<string, string | number> = { page, size: 50 }

    if (activeTab === "inbox") params.label = "inbox"
    else if (activeTab === "job") params.label = "job"
    else if (activeTab === "sent") params.label = "sent"
    else {
      params.label = "all"
      params.category = activeTab
    }

    if (search) params.search = search

    getInbox(params as Parameters<typeof getInbox>[0])
      .then(setInboxData)
      .catch(() => toast.error("Failed to load emails"))
      .finally(() => setLoading(false))
  }, [activeTab, page, search, gmailStatus?.connected])

  useEffect(() => {
    if (!selectedEmail) {
      setBodyHtml(null)
      setBodyText(null)
      return
    }

    setBodyLoading(true)
    setBodyHtml(null)
    setBodyText(null)

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
        setPage(1)
        queryClient.invalidateQueries({ queryKey: ["pending-actions"] })
        queryClient.invalidateQueries({ queryKey: ["board"] })
        queryClient.invalidateQueries({ queryKey: ["applications"] })
        const params: Record<string, string | number> = { page: 1, size: 50 }
        if (activeTab === "inbox") params.label = "inbox"
        else if (activeTab === "job") params.label = "job"
        else if (activeTab === "sent") params.label = "sent"
        else {
          params.label = "all"
          params.category = activeTab
        }
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
        if (inboxData) {
          setInboxData({
            ...inboxData,
            items: inboxData.items.filter((email) => email.id !== selectedEmail.id),
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
        <div className="flex flex-col items-center justify-center gap-3 py-20">
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
    <div className="surface-panel flex h-[calc(100vh-7.5rem)] flex-col overflow-hidden rounded-[2rem]">
      <div className="flex items-center gap-2 border-b border-border/80 bg-background-elevated px-4 py-3">
        {selectedIds.size > 0 ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-border" />
            <Button size="sm" variant="outline" onClick={selectAll}>
              <CheckSquare className="h-4 w-4" />
              {selectedIds.size === (inboxData?.items.length ?? 0) ? "Deselect All" : "Select All"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBatch("mark_read")} disabled={batchLoading}>
              <MailOpen className="h-4 w-4" />
              Mark Read
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBatch("mark_unread")} disabled={batchLoading}>
              <Mail className="h-4 w-4" />
              Mark Unread
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
              onClick={() => handleBatch("trash")}
              disabled={batchLoading}
            >
              <Trash2 className="h-4 w-4" />
              Trash
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={() => { setReplyTo(null); setComposeOpen(true) }}>
              <PenSquare className="h-4 w-4" />
              Compose
            </Button>
            <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              {syncing ? `Syncing... ${syncTimerText}` : "Sync"}
            </Button>
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="h-10 pl-9 text-sm"
              />
            </div>
          </>
        )}
      </div>

      {gmailStatus && gmailStatus.total_emails === 0 && !syncing && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            No emails synced yet. Click Sync to fetch your emails from the last 15 days.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            First sync may take 2-4 minutes depending on how many emails you have.
          </p>
        </div>
      )}

      <div className="flex gap-1 border-b border-border/80 bg-background-elevated px-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              setPage(1)
              setSelectedEmail(null)
            }}
            className={cn(
              "cursor-pointer border-b-2 px-3 py-2 text-xs font-medium transition-colors",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden bg-background-elevated/96">
        <div className="w-96 shrink-0 overflow-y-auto border-r border-border/80 bg-background-elevated">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : inboxData ? (
            <>
              <EmailList
                emails={inboxData.items}
                selectedId={selectedEmail?.id ?? null}
                selectedIds={selectedIds}
                onSelect={setSelectedEmail}
                onToggleSelect={toggleSelect}
              />
              {inboxData.total > inboxData.size && (
                <div className="flex items-center justify-between border-t border-border/80 bg-background-elevated px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    {(page - 1) * inboxData.size + 1}-{Math.min(page * inboxData.size, inboxData.total)} of {inboxData.total}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="h-6 text-xs">
                      Prev
                    </Button>
                    <Button size="sm" variant="ghost" disabled={page * inboxData.size >= inboxData.total} onClick={() => setPage((current) => current + 1)} className="h-6 text-xs">
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="flex-1 overflow-hidden bg-background-elevated">
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
            <div className="flex h-full items-center justify-center bg-background-elevated">
              <div className="text-center">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">Select an email to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

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
