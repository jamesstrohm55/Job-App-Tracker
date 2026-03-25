import { STAGES, STAGE_LABELS, STAGE_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function BoardPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Board</h1>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/50"
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
                <span className="text-xs text-muted-foreground">0</span>
              </div>
            </div>
            <div className="min-h-[200px] p-2">
              <p className="text-center text-xs text-muted-foreground">
                No applications
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
