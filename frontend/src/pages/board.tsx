import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { ApplicationForm } from "@/components/applications/application-form"
import { useBoard, useCreateApplication, useMoveApplication } from "@/hooks/use-applications"
import { useTrashApplicationEmails } from "@/hooks/use-emails"
import { toast } from "sonner"
import type { Stage } from "@/lib/constants"
import type { Application } from "@/types"
import type { ApplicationCreate } from "@/api/applications"

export function BoardPage() {
  const { data, isLoading, error } = useBoard()
  const createApp = useCreateApplication()
  const moveApp = useMoveApplication()
  const trashEmails = useTrashApplicationEmails()

  const [formOpen, setFormOpen] = useState(false)
  const [formStage, setFormStage] = useState<Stage>("saved")
  const [editingApp, setEditingApp] = useState<Application | null>(null)

  const handleAddClick = (stage: Stage) => {
    setFormStage(stage)
    setEditingApp(null)
    setFormOpen(true)
  }

  const handleCardClick = (app: Application) => {
    setEditingApp(app)
    setFormOpen(true)
  }

  const handleMove = (applicationId: string, newStage: Stage, newOrder: number) => {
    moveApp.mutate({ application_id: applicationId, new_stage: newStage, new_order: newOrder })
  }

  const handleSubmit = (data: ApplicationCreate) => {
    createApp.mutate(data, {
      onSuccess: () => setFormOpen(false),
    })
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Board</h1>
        <Button size="sm" onClick={() => handleAddClick("saved")}>
          <Plus className="h-4 w-4" />
          Add Application
        </Button>
      </div>

      {data && (
        <KanbanBoard
          data={data}
          onMove={handleMove}
          onAddClick={handleAddClick}
          onCardClick={handleCardClick}
          onTrashEmails={(appId) => {
            trashEmails.mutate(appId, {
              onSuccess: (result) => {
                toast.success(`Trashed ${result.trashed} email(s)`)
              },
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
    </div>
  )
}
