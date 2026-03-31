import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Video, Clock, Users, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Application } from "@/types"

interface KanbanCardProps {
  application: Application
  onClick?: () => void
  onTrashEmails?: (appId: string) => void
}

function parseMeetingLink(description: string | null): string | null {
  if (!description) return null
  const match = description.match(/Meeting link:\s*(https?:\/\/\S+)/i)
  return match ? match[1] : null
}

function parseParticipants(description: string | null): string | null {
  if (!description) return null
  const match = description.match(/Participants:\s*(.+)/i)
  return match ? match[1] : null
}

function parseScheduled(description: string | null): string | null {
  if (!description) return null
  const match = description.match(/Scheduled:\s*(.+)/i)
  return match ? match[1] : null
}

export function KanbanCard({ application, onClick, onTrashEmails }: KanbanCardProps) {
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

  const isInterview = application.stage === "interview"
  const isRejected = application.stage === "rejected"
  const info = application.interview_info
  const meetingLink = parseMeetingLink(info?.description ?? null)
  const participants = parseParticipants(info?.description ?? null)
  const scheduled = parseScheduled(info?.description ?? null)

  const isPastInterview = application.past_interview

  // Interview card — expanded with meeting details
  if (isInterview && info) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group cursor-pointer rounded-md border px-2.5 py-2 shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5",
          isPastInterview
            ? "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30"
            : "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30",
          isDragging && "opacity-50 shadow-lg"
        )}
        onClick={onClick}
      >
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold leading-tight">{application.company}</p>
                <p className="truncate text-[11px] text-muted-foreground leading-tight">{application.position}</p>
              </div>
              {isPastInterview && (
                <span className="shrink-0 rounded bg-amber-200 dark:bg-amber-800 px-1 py-0.5 text-[9px] font-bold text-amber-800 dark:text-amber-200">
                  UPDATE
                </span>
              )}
            </div>

            {info.title && (
              <p className={`text-[11px] font-medium ${isPastInterview ? "text-amber-700 dark:text-amber-400" : "text-blue-700 dark:text-blue-400"}`}>
                {info.title}
              </p>
            )}

            {scheduled && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                <span className="truncate">{scheduled}</span>
              </div>
            )}

            {participants && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Users className="h-3 w-3 shrink-0" />
                <span className="truncate">{participants}</span>
              </div>
            )}

            {meetingLink && (
              <a
                href={meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                <Video className="h-3 w-3" />
                Join Meeting
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Rejected card — with trash emails button
  if (isRejected) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group cursor-pointer rounded-md border border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20 px-2 py-1.5 shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5",
          isDragging && "opacity-50 shadow-lg"
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-tight line-through opacity-70">{application.company}</p>
            <p className="truncate text-[11px] text-muted-foreground leading-tight">{application.position}</p>
          </div>

          {onTrashEmails && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Trash emails for ${application.company}?`)) {
                  onTrashEmails(application.id)
                }
              }}
              className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400 group-hover:opacity-100"
              title="Trash emails in Gmail"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Default compact card for all other stages
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 cursor-pointer rounded-xl border border-border/30 bg-card/70 backdrop-blur-lg px-2.5 py-2 shadow-sm transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5 hover:bg-card/90",
        isDragging && "opacity-50 shadow-xl scale-105"
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
