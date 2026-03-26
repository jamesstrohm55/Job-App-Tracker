import { Link2Off, Mail, Phone, ExternalLink, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Contact } from "@/types"

interface ContactListProps {
  contacts: Contact[]
  onUnlink?: (contactId: string) => void
  showUnlink?: boolean
}

export function ContactList({ contacts, onUnlink, showUnlink }: ContactListProps) {
  if (contacts.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No contacts linked yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className="flex items-center justify-between rounded-lg border border-border p-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{contact.name}</p>
              <p className="text-xs text-muted-foreground">
                {contact.role}
                {contact.role && contact.company && " at "}
                {contact.company}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title={contact.email}
              >
                <Mail className="h-3.5 w-3.5" />
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title={contact.phone}
              >
                <Phone className="h-3.5 w-3.5" />
              </a>
            )}
            {contact.linkedin_url && (
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {showUnlink && onUnlink && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onUnlink(contact.id)}
                title="Unlink contact"
              >
                <Link2Off className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
