import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { InboxItem } from "@/api/emails"

const INTENT_BADGES: Record<string, { label: string; color: string }> = {
  application_confirmed: { label: "Applied", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  interview: { label: "Interview", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  rejection: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  offer: { label: "Offer", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
}

interface EmailListProps {
  emails: InboxItem[]
  selectedId: string | null
  selectedIds: Set<string>
  onSelect: (email: InboxItem) => void
  onToggleSelect: (emailId: string) => void
}

function getSenderName(from: string): string {
  const match = from.match(/^([^<]+)</)
  return match ? match[1].trim() : from.split("@")[0]
}

function getSenderInitial(from: string): string {
  const name = getSenderName(from)
  return name.charAt(0).toUpperCase()
}

export function EmailList({ emails, selectedId, selectedIds, onSelect, onToggleSelect }: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">No emails</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {emails.map((email) => {
        const badge = email.intent ? INTENT_BADGES[email.intent] : null
        const isSelected = email.id === selectedId
        const isChecked = selectedIds.has(email.id)

        return (
          <div
            key={email.id}
            className={cn(
              "flex w-full items-start gap-2 p-3 text-left transition-all duration-200 ease-out hover:bg-accent/50",
              isSelected && "bg-accent",
              isChecked && "bg-primary/10",
              !email.is_read && !isSelected && !isChecked && "bg-primary/5"
            )}
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleSelect(email.id)}
              className="mt-2.5 h-3.5 w-3.5 shrink-0 rounded border-border accent-primary cursor-pointer"
            />

            {/* Clickable content */}
            <button
              onClick={() => onSelect(email)}
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {getSenderInitial(email.from_address)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("truncate text-sm", !email.is_read && "font-semibold")}>
                    {getSenderName(email.from_address)}
                  </p>
                  {badge && (
                    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium", badge.color)}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <p className={cn("truncate text-xs", !email.is_read ? "text-foreground" : "text-muted-foreground")}>
                  {email.subject}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {email.snippet}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[10px] text-muted-foreground">
                  {email.received_at ? format(new Date(email.received_at), "MMM d") : ""}
                </p>
                {!email.is_read && (
                  <div className="mt-1 ml-auto h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}
