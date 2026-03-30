import { useState } from "react"
import { format } from "date-fns"
import { Plus, Search, Mail, Download, CalendarCheck, X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { ApplicationForm } from "@/components/applications/application-form"
import { useBoard, useCreateApplication, useMoveApplication } from "@/hooks/use-applications"
import { useTrashApplicationEmails, usePendingActions, useDismissEmail, useConfirmRejection } from "@/hooks/use-emails"
import { searchGmail, importAsInterview, type GmailSearchResult } from "@/api/emails"
import { toast } from "sonner"
import type { Stage } from "@/lib/constants"
import type { Application } from "@/types"
import type { ApplicationCreate } from "@/api/applications"
import { useQueryClient } from "@tanstack/react-query"

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

  // Interview import dialog
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<GmailSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<GmailSearchResult | null>(null)
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [importing, setImporting] = useState(false)

  const handleAddClick = (stage: Stage) => {
    if (stage === "interview") {
      setInterviewDialogOpen(true)
      setSearchQuery("")
      setSearchResults([])
      setSelectedEmail(null)
      setCompany("")
      setPosition("")
    } else {
      setFormStage(stage)
      setEditingApp(null)
      setFormOpen(true)
    }
  }

  const handleCardClick = (app: Application) => {
    setEditingApp(app)
    setFormOpen(true)
  }

  const handleMove = (applicationId: string, newStage: Stage, newOrder: number) => {
    moveApp.mutate({ application_id: applicationId, new_stage: newStage, new_order: newOrder })
  }

  const handleSubmit = (data: ApplicationCreate) => {
    createApp.mutate(data, { onSuccess: () => setFormOpen(false) })
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Board</h1>
        <Button size="sm" onClick={() => handleAddClick("saved")}>
          <Plus className="h-4 w-4" />
          Add Application
        </Button>
      </div>

      {/* Unified notification area */}
      {hasActions && (
        <div className="space-y-2">
          {meetings.map((action) => (
            <div key={action.email_id} className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
              <CalendarCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Is this an interview?</p>
                <p className="truncate text-xs text-muted-foreground">{action.subject}</p>
                <p className="truncate text-[11px] text-muted-foreground">{action.from_address}</p>
              </div>
              <Button size="sm" className="h-7 shrink-0 text-xs" onClick={() => {
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
              }}>
                Yes, Interview
              </Button>
              <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => dismissEmail.mutate(action.email_id!)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {pastInterviews.map((action) => (
            <div key={action.application_id} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Interview passed — how did it go?</p>
                <p className="text-xs text-muted-foreground">{action.company} · {action.position}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => handleMove(action.application_id!, "screening", 0)}>Waiting</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400"
                  onClick={() => handleMove(action.application_id!, "offer", 0)}>Got Offer</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                  onClick={() => handleMove(action.application_id!, "rejected", 0)}>Rejected</Button>
              </div>
            </div>
          ))}

          {rejections.map((action) => (
            <div key={action.email_id} className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
              <X className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Rejection detected for {action.company}</p>
                <p className="truncate text-xs text-muted-foreground">{action.subject}</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                onClick={() => confirmRejection.mutate({ emailId: action.email_id!, applicationId: action.application_id! })}>
                Confirm
              </Button>
              <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => dismissEmail.mutate(action.email_id!)}>
                Ignore
              </Button>
            </div>
          ))}
        </div>
      )}

      {data && (
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
      )}

      <ApplicationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        defaultStage={formStage}
        application={editingApp ?? undefined}
        loading={createApp.isPending}
      />

      {/* Import Interview from Email */}
      <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
        <DialogContent onClose={() => setInterviewDialogOpen(false)} className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Import Interview from Email
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {!selectedEmail && (
              <>
                <Label>Search Gmail</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Name, company, subject..." value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="pl-8" />
                  </div>
                  <Button size="sm" disabled={searching} onClick={handleSearch}>
                    {searching ? "..." : "Search"}
                  </Button>
                </div>
                {searchResults.length > 0 && (
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button key={result.gmail_message_id}
                        onClick={() => {
                          setSelectedEmail(result)
                          if (!company) {
                            const m = result.from_address.match(/^([^<]+)</)
                            if (m) setCompany(m[1].trim())
                          }
                        }}
                        className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-xs">{result.subject}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{result.from_address}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {format(new Date(result.received_at), "MMM d")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {selectedEmail && (
              <div className="space-y-3">
                <div className="rounded-md bg-muted p-2 text-xs">
                  <p className="font-medium">{selectedEmail.subject}</p>
                  <p className="text-muted-foreground">{selectedEmail.from_address}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="company" className="text-xs">Company *</Label>
                    <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)}
                      placeholder="MetaCTO" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="position" className="text-xs">Position</Label>
                    <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)}
                      placeholder="Software Engineer" className="h-8 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedEmail(null)}>Back</Button>
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
    </div>
  )
}
