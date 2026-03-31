import { useState } from "react"
import { format } from "date-fns"
import {
  AlertTriangle,
  CalendarCheck,
  Download,
  Mail,
  Plus,
  Search,
  X,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { importAsInterview, searchGmail, type GmailSearchResult } from "@/api/emails"
import type { ApplicationCreate } from "@/api/applications"
import { ApplicationForm } from "@/components/applications/application-form"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateApplication, useBoard, useMoveApplication } from "@/hooks/use-applications"
import {
  useConfirmRejection,
  useDismissEmail,
  usePendingActions,
  useTrashApplicationEmails,
} from "@/hooks/use-emails"
import type { Stage } from "@/lib/constants"
import type { Application } from "@/types"
import { toast } from "sonner"

export function BoardPage() {
  const { data, isLoading, error } = useBoard()
  const createApp = useCreateApplication()
  const moveApp = useMoveApplication()
  const trashEmails = useTrashApplicationEmails()
  const { data: pendingActions } = usePendingActions()
  const dismissEmail = useDismissEmail()
  const confirmRejection = useConfirmRejection()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [formStage, setFormStage] = useState<Stage>("saved")
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<GmailSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<GmailSearchResult | null>(null)
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [importing, setImporting] = useState(false)
  const [interviewDetailApp, setInterviewDetailApp] = useState<Application | null>(null)

  const handleAddClick = (stage: Stage) => {
    if (stage === "interview") {
      setInterviewDialogOpen(true)
      setSearchQuery("")
      setSearchResults([])
      setSelectedEmail(null)
      setCompany("")
      setPosition("")
      return
    }

    setFormStage(stage)
    setEditingApp(null)
    setFormOpen(true)
  }

  const handleCardClick = (app: Application) => {
    if (app.stage === "interview" && app.interview_info) {
      setInterviewDetailApp(app)
      return
    }

    setEditingApp(app)
    setFormOpen(true)
  }

  const handleMove = (applicationId: string, newStage: Stage, newOrder: number) => {
    moveApp.mutate({ application_id: applicationId, new_stage: newStage, new_order: newOrder })
  }

  const handleSubmit = (payload: ApplicationCreate) => {
    createApp.mutate(payload, { onSuccess: () => setFormOpen(false) })
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    searchGmail(searchQuery.trim())
      .then(setSearchResults)
      .catch(() => toast.error("Search failed"))
      .finally(() => setSearching(false))
  }

  const handleImportInterview = () => {
    if (!selectedEmail || !company.trim()) return
    setImporting(true)
    importAsInterview(selectedEmail.gmail_message_id, company.trim(), position.trim() || undefined)
      .then(() => {
        toast.success(`Interview imported for ${company}`)
        setInterviewDialogOpen(false)
        queryClient.invalidateQueries({ queryKey: ["board"] })
        queryClient.invalidateQueries({ queryKey: ["applications"] })
        queryClient.invalidateQueries({ queryKey: ["pending-actions"] })
      })
      .catch(() => toast.error("Import failed"))
      .finally(() => setImporting(false))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading board...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">Failed to load board. Is the backend running?</p>
      </div>
    )
  }

  const meetings = pendingActions?.filter((a) => a.type === "new_meeting") ?? []
  const pastInterviews = pendingActions?.filter((a) => a.type === "past_interview") ?? []
  const rejections = pendingActions?.filter((a) => a.type === "rejection_detected") ?? []
  const hasActions = meetings.length + pastInterviews.length + rejections.length > 0

  return (
    <div className="space-y-6">
      <section className="surface-panel overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
              Pipeline Board
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Keep every opportunity visible, sortable, and actionable.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Drag opportunities between stages, pull interviews in from Gmail, and resolve pending follow-ups before momentum slips.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="rounded-2xl border border-border/80 bg-background-elevated/80 px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Queue</p>
              <p className="mt-2 text-sm font-semibold">{hasActions ? `${meetings.length + pastInterviews.length + rejections.length} pending actions` : "All clear"}</p>
            </div>
            <Button size="lg" onClick={() => handleAddClick("saved")}>
              <Plus className="h-4 w-4" />
              Add Application
            </Button>
          </div>
        </div>
      </section>

      {hasActions && (
        <section className="space-y-3 stagger-children">
          {meetings.map((action) => (
            <div key={action.email_id} className="surface-panel flex flex-col gap-3 rounded-3xl p-4 md:flex-row md:items-center">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-sky-100 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Potential interview detected</p>
                  <p className="truncate text-sm text-muted-foreground">{action.subject}</p>
                  <p className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {action.from_address}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 md:ml-auto">
                <Button
                  size="sm"
                  onClick={() => {
                    setInterviewDialogOpen(true)
                    setSearchQuery("")
                    setSearchResults([])
                    setSelectedEmail({
                      gmail_message_id: action.gmail_message_id!,
                      subject: action.subject!,
                      from_address: action.from_address!,
                      snippet: action.snippet || "",
                      received_at: action.received_at || "",
                      is_stored: true,
                    })
                    setCompany(action.extracted_company || "")
                    setPosition("")
                  }}
                >
                  Confirm Interview
                </Button>
                <Button size="sm" variant="ghost" onClick={() => dismissEmail.mutate(action.email_id!)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {pastInterviews.map((action) => (
            <div key={action.application_id} className="surface-panel flex flex-col gap-3 rounded-3xl p-4 md:flex-row md:items-center">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Interview completed. Update the outcome.</p>
                  <p className="text-sm text-muted-foreground">{action.company} / {action.position}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 md:ml-auto">
                <Button size="sm" variant="outline" onClick={() => handleMove(action.application_id!, "screening", 0)}>
                  Waiting
                </Button>
                <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-300" onClick={() => handleMove(action.application_id!, "offer", 0)}>
                  Got Offer
                </Button>
                <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300" onClick={() => handleMove(action.application_id!, "rejected", 0)}>
                  Rejected
                </Button>
              </div>
            </div>
          ))}

          {rejections.map((action) => (
            <div key={action.email_id} className="surface-panel flex flex-col gap-3 rounded-3xl p-4 md:flex-row md:items-center">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-red-100 p-2 text-red-700 dark:bg-red-950 dark:text-red-300">
                  <X className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Rejection detected for {action.company}</p>
                  <p className="truncate text-sm text-muted-foreground">{action.subject}</p>
                </div>
              </div>
              <div className="flex gap-2 md:ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"
                  onClick={() => confirmRejection.mutate({ emailId: action.email_id!, applicationId: action.application_id! })}
                >
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => dismissEmail.mutate(action.email_id!)}>
                  Ignore
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {data && (
        <div className="surface-panel rounded-[2rem] p-4">
          <KanbanBoard
            data={data}
            onMove={handleMove}
            onAddClick={handleAddClick}
            onCardClick={handleCardClick}
            onTrashEmails={(appId) => {
              trashEmails.mutate(appId, {
                onSuccess: (result) => toast.success(`Trashed ${result.trashed} email(s)`),
                onError: () => toast.error("Failed to trash emails"),
              })
            }}
          />
        </div>
      )}

      <ApplicationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        defaultStage={formStage}
        application={editingApp ?? undefined}
        loading={createApp.isPending}
      />

      <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
        <DialogContent onClose={() => setInterviewDialogOpen(false)} className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Import Interview from Email
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedEmail && (
              <>
                <Label>Search Gmail</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Name, company, subject..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-9"
                    />
                  </div>
                  <Button size="sm" disabled={searching} onClick={handleSearch}>
                    {searching ? "..." : "Search"}
                  </Button>
                </div>
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.gmail_message_id}
                        onClick={() => {
                          setSelectedEmail(result)
                          if (!company) {
                            const match = result.from_address.match(/^([^<]+)</)
                            if (match) setCompany(match[1].trim())
                          }
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-2xl border border-border/80 bg-background-elevated/80 p-3 text-left hover:border-primary/25 hover:bg-accent"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{result.subject}</p>
                          <p className="truncate text-xs text-muted-foreground">{result.from_address}</p>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {format(new Date(result.received_at), "MMM d")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {selectedEmail && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/80 bg-background-elevated/80 p-3 text-sm">
                  <p className="font-medium">{selectedEmail.subject}</p>
                  <p className="text-muted-foreground">{selectedEmail.from_address}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="company" className="text-xs">Company *</Label>
                    <Input
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="MetaCTO"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="position" className="text-xs">Position</Label>
                    <Input
                      id="position"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="Software Engineer"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedEmail(null)}>
                    Back
                  </Button>
                  <Button className="flex-1" disabled={!company.trim() || importing} onClick={handleImportInterview}>
                    <Download className="h-4 w-4" />
                    {importing ? "Importing..." : "Import as Interview"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!interviewDetailApp} onOpenChange={(open) => !open && setInterviewDetailApp(null)}>
        <DialogContent onClose={() => setInterviewDetailApp(null)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Interview Details</DialogTitle>
          </DialogHeader>
          {interviewDetailApp && <InterviewDetailContent app={interviewDetailApp} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InterviewDetailContent({ app }: { app: Application }) {
  const info = app.interview_info
  if (!info) return <p className="text-sm text-muted-foreground">No interview details available.</p>

  const desc = info.description || ""
  const lines = desc.split("\n")
  const scheduledLine = lines.find((line) => line.startsWith("Scheduled:"))
  const participantsLine = lines.find((line) => line.startsWith("Participants:"))
  const meetingLinkLine = lines.find((line) => line.startsWith("Meeting link:"))
  const scheduled = scheduledLine?.replace("Scheduled: ", "")
  const participants = participantsLine?.replace("Participants: ", "")
  const meetingLink = meetingLinkLine?.replace("Meeting link: ", "")

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/80 bg-background-elevated/80 p-4">
        <p className="text-lg font-semibold">{app.company}</p>
        <p className="text-sm text-muted-foreground">{app.position}</p>
      </div>

      {info.title && (
        <div className="inline-flex rounded-full bg-primary/12 px-3 py-1.5 text-sm font-medium text-primary">
          {info.title}
        </div>
      )}

      <div className="space-y-3">
        {scheduled && (
          <div className="rounded-2xl border border-border/70 bg-background-elevated/75 p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Date and Time</p>
            <p className="mt-2 text-sm">{scheduled}</p>
          </div>
        )}
        {participants && (
          <div className="rounded-2xl border border-border/70 bg-background-elevated/75 p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Participants</p>
            <p className="mt-2 text-sm">{participants}</p>
          </div>
        )}
        {meetingLink && (
          <div className="rounded-2xl border border-border/70 bg-background-elevated/75 p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Meeting Link</p>
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary/12 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/18"
            >
              Join Meeting
            </a>
          </div>
        )}
        {app.applied_date && (
          <div className="rounded-2xl border border-border/70 bg-background-elevated/75 p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Applied</p>
            <p className="mt-2 text-sm">{app.applied_date}</p>
          </div>
        )}
      </div>
    </div>
  )
}
