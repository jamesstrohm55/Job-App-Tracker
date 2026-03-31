import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Clock, GripVertical, Trash2, Users, Video } from "lucide-react"
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

  if (isInterview && info) {
    return (
      <article
        ref={setNodeRef}
        style={style}
        data-kanban-card
        className={cn(
          "group rounded-2xl border px-3 py-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg",
          isPastInterview
            ? "border-amber-200 bg-amber-50/90 dark:border-amber-900 dark:bg-amber-950/30"
            : "border-sky-200 bg-sky-50/90 dark:border-sky-900 dark:bg-sky-950/30",
          isDragging && "scale-[1.02] opacity-50 shadow-xl"
        )}
      >
        <div className="flex items-start gap-2.5">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab rounded-lg p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            aria-label={`Drag ${application.company}`}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <button onClick={onClick} className="min-w-0 flex-1 cursor-pointer text-left">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{application.company}</p>
                <p className="truncate text-xs text-muted-foreground">{application.position}</p>
              </div>
              {isPastInterview && (
                <span className="rounded-full bg-amber-200 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Update
                </span>
              )}
            </div>

            {info.title && (
              <p className={cn("mt-3 text-xs font-medium", isPastInterview ? "text-amber-700 dark:text-amber-300" : "text-sky-700 dark:text-sky-300")}>
                {info.title}
              </p>
            )}

            <div className="mt-3 space-y-1.5">
              {scheduled && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{scheduled}</span>
                </div>
              )}
              {participants && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{participants}</span>
                </div>
              )}
            </div>

            {meetingLink && (
              <a
                href={meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary/12 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/18"
              >
                <Video className="h-3.5 w-3.5" />
                Join Meeting
              </a>
            )}
          </button>
        </div>
      </article>
    )
  }

  if (isRejected) {
    return (
      <article
        ref={setNodeRef}
        style={style}
        data-kanban-card
        className={cn(
          "group rounded-2xl border border-red-200 bg-red-50/85 px-3 py-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg dark:border-red-950 dark:bg-red-950/25",
          isDragging && "scale-[1.02] opacity-50 shadow-xl"
        )}
      >
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab rounded-lg p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            aria-label={`Drag ${application.company}`}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <button onClick={onClick} className="min-w-0 flex-1 cursor-pointer text-left">
            <p className="truncate text-sm font-medium leading-tight line-through opacity-70">{application.company}</p>
            <p className="truncate text-xs text-muted-foreground">{application.position}</p>
          </button>

          {onTrashEmails && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Trash emails for ${application.company}?`)) {
                  onTrashEmails(application.id)
                }
              }}
              className="cursor-pointer rounded-xl p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-red-100 hover:text-red-700 group-hover:opacity-100 dark:hover:bg-red-950 dark:hover:text-red-300"
              title="Trash emails in Gmail"
              aria-label={`Trash emails for ${application.company}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </article>
    )
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      data-kanban-card
      className={cn(
        "group rounded-2xl border border-border/80 bg-background-elevated/92 px-3 py-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg",
        isDragging && "scale-[1.02] opacity-50 shadow-xl"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-lg p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          aria-label={`Drag ${application.company}`}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <button onClick={onClick} className="min-w-0 flex-1 cursor-pointer text-left">
          <p className="truncate text-sm font-medium">{application.company}</p>
          <p className="truncate text-xs text-muted-foreground">{application.position}</p>
        </button>

        {application.applied_date && (
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {new Date(application.applied_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </article>
  )
}
