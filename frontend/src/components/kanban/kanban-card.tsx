import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, MapPin, ExternalLink } from "lucide-react"
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
        "group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-50 shadow-lg"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium">{application.company}</h4>
          <p className="truncate text-xs text-muted-foreground">{application.position}</p>

          <div className="mt-2 flex items-center gap-2">
            {application.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{application.location}</span>
              </span>
            )}
            {application.url && (
              <a
                href={application.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {application.salary_max && (
            <p className="mt-1 text-xs text-muted-foreground">
              {application.salary_currency}{" "}
              {application.salary_min?.toLocaleString()}
              {application.salary_min && application.salary_max && " - "}
              {application.salary_max?.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
