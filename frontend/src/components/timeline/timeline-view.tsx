import { format } from "date-fns"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TimelineEvent } from "@/types"

const EVENT_TYPE_COLORS: Record<string, string> = {
  applied: "bg-blue-500",
  phone_screen: "bg-purple-500",
  technical_interview: "bg-amber-500",
  behavioral_interview: "bg-amber-500",
  onsite: "bg-orange-500",
  take_home: "bg-indigo-500",
  offer: "bg-green-500",
  rejection: "bg-red-500",
  withdrawal: "bg-gray-500",
  follow_up: "bg-cyan-500",
  other: "bg-slate-500",
}

interface TimelineViewProps {
  events: TimelineEvent[]
  onDelete?: (eventId: string) => void
}

export function TimelineView({ events, onDelete }: TimelineViewProps) {
  if (events.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No timeline events yet.
      </p>
    )
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

      {events.map((event) => (
        <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Dot */}
          <div
            className={`relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-2 border-background ${
              EVENT_TYPE_COLORS[event.event_type] || "bg-slate-500"
            }`}
          />

          {/* Content */}
          <div className="flex-1 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.event_date), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDelete(event.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
            {event.description && (
              <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
            )}
            <span className="mt-1 inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {event.event_type.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
