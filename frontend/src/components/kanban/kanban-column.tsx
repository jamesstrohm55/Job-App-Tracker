import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { STAGE_COLORS, STAGE_LABELS, type Stage } from "@/lib/constants"
import type { Application } from "@/types"
import { KanbanCard } from "./kanban-card"

interface KanbanColumnProps {
  stage: Stage
  applications: Application[]
  onAddClick: () => void
  onCardClick: (app: Application) => void
}

export function KanbanColumn({
  stage,
  applications,
  onAddClick,
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/50 transition-colors",
        isOver && "border-primary/50 bg-muted"
      )}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-medium",
              STAGE_COLORS[stage]
            )}
          >
            {STAGE_LABELS[stage]}
          </span>
          <span className="text-xs text-muted-foreground">{applications.length}</span>
        </div>
        <button
          onClick={onAddClick}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div ref={setNodeRef} className="flex min-h-[200px] flex-col gap-2 p-2">
        <SortableContext
          items={applications.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((app) => (
            <KanbanCard
              key={app.id}
              application={app}
              onClick={() => onCardClick(app)}
            />
          ))}
        </SortableContext>

        {applications.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Drop here or click + to add
          </p>
        )}
      </div>
    </div>
  )
}
