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
    <section
      className={cn(
        "surface-panel flex w-[18rem] shrink-0 flex-col rounded-[1.75rem] transition-all duration-200",
        isOver && "border-primary/50 shadow-[0_20px_40px_rgba(2,132,199,0.12)]"
      )}
    >
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
              STAGE_COLORS[stage]
            )}
          >
            {STAGE_LABELS[stage]}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {applications.length}
          </span>
        </div>
        <button
          onClick={onAddClick}
          className="flex cursor-pointer items-center gap-1 rounded-xl border border-transparent px-2 py-1 text-xs font-medium text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground"
          aria-label={`Add application to ${STAGE_LABELS[stage]}`}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <div ref={setNodeRef} className="flex min-h-[28rem] flex-col gap-2 overflow-y-auto px-3 py-3">
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
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background-elevated/70 px-4 py-12 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Drop Here
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
