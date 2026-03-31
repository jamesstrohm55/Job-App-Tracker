import { useState } from "react"
import { ExternalLink, Mail, Phone, Plus, Search, Trash2 } from "lucide-react"
import type { ContactCreate } from "@/api/contacts"
import { ContactForm } from "@/components/contacts/contact-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useContacts, useCreateContact, useDeleteContact, useUpdateContact } from "@/hooks/use-contacts"
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
    <div className="space-y-5">
      <section className="surface-panel rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Network Directory</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Contacts</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep people records readable and scannable without the background competing for attention.
            </p>
          </div>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </section>

      <section className="surface-panel rounded-[2rem] p-4 md:p-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="surface-panel rounded-[2rem] py-16">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      ) : !data?.items.length ? (
        <div className="surface-panel rounded-[2rem] py-16">
          <p className="text-center text-muted-foreground">
            No contacts found. Click "Add Contact" to get started.
          </p>
        </div>
      ) : (
        <div className="surface-panel overflow-hidden rounded-[2rem]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-background-elevated">
                <th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Name</th>
                <th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Role</th>
                <th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Company</th>
                <th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Contact</th>
                <th className="px-5 py-4 text-right font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-background-elevated/96">
              {data.items.map((contact) => (
                <tr
                  key={contact.id}
                  className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-accent/55"
                  onClick={() => setEditingContact(contact)}
                >
                  <td className="px-5 py-4 font-medium">{contact.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{contact.role || "-"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{contact.company || "-"}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          title={contact.email}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                          className="rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
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
