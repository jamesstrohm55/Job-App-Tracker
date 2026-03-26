import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  Trash2,
  Plus,
  Link2,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ApplicationForm } from "@/components/applications/application-form"
import { ContactList } from "@/components/contacts/contact-list"
import { ContactForm } from "@/components/contacts/contact-form"
import { TimelineView } from "@/components/timeline/timeline-view"
import { TimelineEventForm } from "@/components/timeline/timeline-event-form"
import type { ApplicationCreate } from "@/api/applications"
import type { ContactCreate } from "@/api/contacts"
import type { TimelineEventCreate } from "@/api/timeline"
import { useApplication, useUpdateApplication, useDeleteApplication } from "@/hooks/use-applications"
import {
  useApplicationContacts,
  useContacts,
  useCreateContact,
  useLinkContact,
  useUnlinkContact,
} from "@/hooks/use-contacts"
import { useTimelineEvents, useCreateTimelineEvent, useDeleteTimelineEvent } from "@/hooks/use-timeline"
import { STAGES, STAGE_LABELS, STAGE_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: app, isLoading } = useApplication(id!)
  const updateApp = useUpdateApplication()
  const deleteApp = useDeleteApplication()

  // Contacts
  const { data: linkedContacts } = useApplicationContacts(id!)
  const { data: allContacts } = useContacts()
  const createContact = useCreateContact()
  const linkContact = useLinkContact()
  const unlinkContact = useUnlinkContact()

  // Timeline
  const { data: events } = useTimelineEvents(id!)
  const createEvent = useCreateTimelineEvent()
  const deleteEvent = useDeleteTimelineEvent()

  // UI state
  const [editOpen, setEditOpen] = useState(false)
  const [contactFormOpen, setContactFormOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "contacts">("details")

  if (isLoading) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  if (!app) {
    return <p className="text-destructive">Application not found.</p>
  }

  const handleStageChange = (newStage: string) => {
    updateApp.mutate({ id: app.id, data: { stage: newStage as typeof app.stage } })
  }

  const handleDelete = () => {
    if (confirm("Delete this application?")) {
      deleteApp.mutate(app.id, { onSuccess: () => navigate("/applications") })
    }
  }

  const handleEditSubmit = (data: ApplicationCreate) => {
    updateApp.mutate(
      { id: app.id, data },
      { onSuccess: () => setEditOpen(false) }
    )
  }

  const handleCreateContact = (data: ContactCreate) => {
    createContact.mutate(data, {
      onSuccess: (newContact) => {
        linkContact.mutate({ appId: id!, contactId: newContact.id })
        setContactFormOpen(false)
      },
    })
  }

  const handleLinkExisting = (contactId: string) => {
    linkContact.mutate({ appId: id!, contactId })
    setLinkDialogOpen(false)
  }

  const handleAddEvent = (data: TimelineEventCreate) => {
    createEvent.mutate(
      { appId: id!, data },
      { onSuccess: () => setEventFormOpen(false) }
    )
  }

  // Contacts not yet linked to this application
  const unlinkableContacts = allContacts?.items.filter(
    (c) => !linkedContacts?.some((lc) => lc.id === c.id)
  ) ?? []

  const tabs = [
    { key: "details" as const, label: "Details" },
    { key: "timeline" as const, label: `Timeline (${events?.length ?? 0})` },
    { key: "contacts" as const, label: `Contacts (${linkedContacts?.length ?? 0})` },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{app.company}</h1>
          <p className="text-muted-foreground">{app.position}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Stage selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Stage:</span>
        <div className="flex gap-1">
          {STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() => handleStageChange(stage)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                app.stage === stage
                  ? STAGE_COLORS[stage]
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {STAGE_LABELS[stage]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-lg border border-border p-4">
            <h3 className="font-semibold">Details</h3>

            {app.url && (
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  {app.url}
                </a>
              </div>
            )}

            {app.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{app.location}</span>
              </div>
            )}

            {app.work_model && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{app.work_model}</span>
              </div>
            )}

            {app.applied_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Applied {app.applied_date}</span>
              </div>
            )}

            {(app.salary_min || app.salary_max) && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>
                  {app.salary_currency}{" "}
                  {app.salary_min?.toLocaleString()}
                  {app.salary_min && app.salary_max && " - "}
                  {app.salary_max?.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4">
            <h3 className="font-semibold">Notes</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {app.notes || "No notes yet."}
            </p>
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setEventFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </div>
          <TimelineView
            events={events ?? []}
            onDelete={(eventId) => deleteEvent.mutate(eventId)}
          />
        </div>
      )}

      {activeTab === "contacts" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            {unlinkableContacts.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLinkDialogOpen(true)}
              >
                <Link2 className="h-4 w-4" />
                Link Existing
              </Button>
            )}
            <Button size="sm" onClick={() => setContactFormOpen(true)}>
              <Plus className="h-4 w-4" />
              New Contact
            </Button>
          </div>
          <ContactList
            contacts={linkedContacts ?? []}
            showUnlink
            onUnlink={(contactId) =>
              unlinkContact.mutate({ appId: id!, contactId })
            }
          />
        </div>
      )}

      {/* Dialogs */}
      <ApplicationForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEditSubmit}
        application={app}
        loading={updateApp.isPending}
      />

      <ContactForm
        open={contactFormOpen}
        onOpenChange={setContactFormOpen}
        onSubmit={handleCreateContact}
        loading={createContact.isPending}
      />

      <TimelineEventForm
        open={eventFormOpen}
        onOpenChange={setEventFormOpen}
        onSubmit={handleAddEvent}
        loading={createEvent.isPending}
      />

      {/* Link existing contact dialog */}
      {linkDialogOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/80"
            onClick={() => setLinkDialogOpen(false)}
          />
          <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">Link Existing Contact</h3>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {unlinkableContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleLinkExisting(contact.id)}
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {contact.role}
                      {contact.role && contact.company && " at "}
                      {contact.company}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
