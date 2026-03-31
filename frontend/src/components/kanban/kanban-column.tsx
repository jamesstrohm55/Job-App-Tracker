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
  onTrashEmails?: (appId: string) => void
}

export function KanbanColumn({
  stage,
  applications,
  onAddClick,
  onCardClick,
  onTrashEmails,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      className={cn(
        "flex w-56 shrink-0 flex-col rounded-2xl border border-border/30 bg-muted/20 backdrop-blur-lg transition-all duration-200",
        isOver && "border-primary/40 bg-muted/50 shadow-xl shadow-primary/5"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              STAGE_COLORS[stage]
            )}
          >
            {STAGE_LABELS[stage]}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">{applications.length}</span>
        </div>
        <button
          onClick={onAddClick}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex max-h-[calc(100vh-220px)] min-h-[80px] flex-col gap-1 overflow-y-auto p-1.5"
      >
        <SortableContext
          items={applications.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((app) => (
            <KanbanCard
              key={app.id}
              application={app}
              onClick={() => onCardClick(app)}
              onTrashEmails={onTrashEmails}
            />
          ))}
        </SortableContext>

        {applications.length === 0 && (
          <p className="py-6 text-center text-[10px] text-muted-foreground">
            Drop here
          </p>
        )}
      </div>
    </div>
  )
}
