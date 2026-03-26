import { useState } from "react"
import { Plus, Search, Trash2, Mail, Phone, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ContactForm } from "@/components/contacts/contact-form"
import { useContacts, useCreateContact, useDeleteContact, useUpdateContact } from "@/hooks/use-contacts"
import type { ContactCreate } from "@/api/contacts"
import type { Contact } from "@/types"

export function ContactsPage() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  const { data, isLoading } = useContacts({
    search: search || undefined,
  })

  const createContact = useCreateContact()
  const updateContact = useUpdateContact()
  const deleteContact = useDeleteContact()

  const handleCreate = (formData: ContactCreate) => {
    createContact.mutate(formData, {
      onSuccess: () => setFormOpen(false),
    })
  }

  const handleEdit = (formData: ContactCreate) => {
    if (!editingContact) return
    updateContact.mutate(
      { id: editingContact.id, data: formData },
      { onSuccess: () => setEditingContact(null) }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !data?.items.length ? (
        <p className="py-10 text-center text-muted-foreground">
          No contacts found. Click "Add Contact" to get started.
        </p>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Company</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => setEditingContact(contact)}
                >
                  <td className="px-4 py-3 font-medium">{contact.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{contact.role || "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{contact.company || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          title={contact.email}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm("Delete this contact?")) {
                          deleteContact.mutate(contact.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        loading={createContact.isPending}
      />

      <ContactForm
        open={!!editingContact}
        onOpenChange={(open) => !open && setEditingContact(null)}
        onSubmit={handleEdit}
        contact={editingContact ?? undefined}
        loading={updateContact.isPending}
      />
    </div>
  )
}
