import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Application } from "@/types"

interface KanbanCardProps {
  application: Application
  onClick?: () => void
}

export function KanbanCard({ application, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 cursor-pointer rounded-md border border-border bg-card px-2 py-1.5 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-50 shadow-lg"
      )}
      onClick={onClick}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium leading-tight">{application.company}</p>
        <p className="truncate text-[11px] text-muted-foreground leading-tight">{application.position}</p>
      </div>

      {application.applied_date && (
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {new Date(application.applied_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      )}
    </div>
  )
}
