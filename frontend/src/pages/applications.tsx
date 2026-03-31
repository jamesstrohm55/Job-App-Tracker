import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Search, Trash2 } from "lucide-react"
import type { ApplicationCreate } from "@/api/applications"
import { ApplicationForm } from "@/components/applications/application-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useApplications, useCreateApplication, useDeleteApplication } from "@/hooks/use-applications"
import { STAGES, STAGE_COLORS, STAGE_LABELS, type Stage } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function ApplicationsPage() {
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<Stage | "">("")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)

  const { data, isLoading } = useApplications({
    search: search || undefined,
    stage: (stageFilter || undefined) as Stage | undefined,
    page,
    size: 20,
  })

  const createApp = useCreateApplication()
  const deleteApp = useDeleteApplication()
  const navigate = useNavigate()

  const handleSubmit = (payload: ApplicationCreate) => {
    createApp.mutate(payload, {
      onSuccess: () => setFormOpen(false),
    })
  }

  return (
    <div className="space-y-5">
      <section className="surface-panel rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Application Directory</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Applications</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Review your full pipeline in a cleaner, high-contrast list view.
            </p>
          </div>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Application
          </Button>
        </div>
      </section>

      <section className="surface-panel rounded-[2rem] p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search company or position..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value as Stage | "")
              setPage(1)
            }}
            className="w-full md:w-44"
          >
            <option value="">All stages</option>
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </Select>
        </div>
      </section>

      {isLoading ? (
        <div className="surface-panel rounded-[2rem] py-16">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      ) : !data?.items.length ? (
        <div className="surface-panel rounded-[2rem] py-16">
          <p className="text-center text-muted-foreground">
            No applications found. Click "Add Application" to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="surface-panel overflow-hidden rounded-[2rem]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-background-elevated">
                  <th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Company</th>
                  <th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Position</th>
                  <th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Stage</th>
                  <th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Location</th>
                  <th className="px-5 py-4 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Applied</th>
                  <th className="px-5 py-4 text-right font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-background-elevated/96">
                {data.items.map((app) => (
                  <tr
                    key={app.id}
                    className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-accent/55"
                    onClick={() => navigate(`/applications/${app.id}`)}
                  >
                    <td className="px-5 py-4 font-medium">{app.company}</td>
                    <td className="px-5 py-4 text-muted-foreground">{app.position}</td>
                    <td className="px-5 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STAGE_COLORS[app.stage])}>
                        {STAGE_LABELS[app.stage]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{app.location || "-"}</td>
                    <td className="px-5 py-4 text-muted-foreground">{app.applied_date || "-"}</td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm("Delete this application?")) {
                            deleteApp.mutate(app.id)
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

          {data.total > data.size && (
            <div className="surface-panel flex items-center justify-between rounded-[2rem] px-5 py-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * data.size + 1}-{Math.min(page * data.size, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page * data.size >= data.total} onClick={() => setPage((current) => current + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ApplicationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        loading={createApp.isPending}
      />
    </div>
  )
}
