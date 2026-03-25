import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ApplicationForm } from "@/components/applications/application-form"
import type { ApplicationCreate } from "@/api/applications"
import { useApplication, useUpdateApplication, useDeleteApplication } from "@/hooks/use-applications"
import { STAGES, STAGE_LABELS, STAGE_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: app, isLoading } = useApplication(id!)
  const updateApp = useUpdateApplication()
  const deleteApp = useDeleteApplication()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  if (!app) {
    return <p className="text-destructive">Application not found.</p>
  }

  const handleStageChange = (newStage: string) => {
    updateApp.mutate({ id: app.id, data: { stage: newStage as typeof app.stage } })
  }

  const handleDelete = () => {
    if (confirm("Delete this application?")) {
      deleteApp.mutate(app.id, { onSuccess: () => navigate("/applications") })
    }
  }

  const handleEditSubmit = (data: ApplicationCreate) => {
    updateApp.mutate(
      { id: app.id, data },
      { onSuccess: () => setEditOpen(false) }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{app.company}</h1>
          <p className="text-muted-foreground">{app.position}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Stage selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Stage:</span>
        <div className="flex gap-1">
          {STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() => handleStageChange(stage)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                app.stage === stage
                  ? STAGE_COLORS[stage]
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {STAGE_LABELS[stage]}
            </button>
          ))}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h3 className="font-semibold">Details</h3>

          {app.url && (
            <div className="flex items-center gap-2 text-sm">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
              >
                {app.url}
              </a>
            </div>
          )}

          {app.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{app.location}</span>
            </div>
          )}

          {app.work_model && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{app.work_model}</span>
            </div>
          )}

          {app.applied_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Applied {app.applied_date}</span>
            </div>
          )}

          {(app.salary_min || app.salary_max) && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>
                {app.salary_currency}{" "}
                {app.salary_min?.toLocaleString()}
                {app.salary_min && app.salary_max && " - "}
                {app.salary_max?.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <h3 className="font-semibold">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {app.notes || "No notes yet."}
          </p>
        </div>
      </div>

      {/* Placeholder sections for Phase 3+ */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <h3 className="font-semibold">Timeline</h3>
          <p className="mt-2 text-sm text-muted-foreground">Timeline events coming in Phase 3.</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <h3 className="font-semibold">Contacts</h3>
          <p className="mt-2 text-sm text-muted-foreground">Contact management coming in Phase 3.</p>
        </div>
      </div>

      <ApplicationForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEditSubmit}
        application={app}
        loading={updateApp.isPending}
      />
    </div>
  )
}
