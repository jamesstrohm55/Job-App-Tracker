import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { ApplicationForm } from "@/components/applications/application-form"
import { useApplications, useCreateApplication, useDeleteApplication } from "@/hooks/use-applications"
import { STAGES, STAGE_LABELS, STAGE_COLORS, type Stage } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { ApplicationCreate } from "@/api/applications"

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

  const handleSubmit = (data: ApplicationCreate) => {
    createApp.mutate(data, {
      onSuccess: () => setFormOpen(false),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Application
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company or position..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={stageFilter}
          onChange={(e) => {
            setStageFilter(e.target.value as Stage | "")
            setPage(1)
          }}
          className="w-40"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !data?.items.length ? (
        <p className="py-10 text-center text-muted-foreground">
          No applications found. Click "Add Application" to get started.
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Company</th>
                  <th className="px-4 py-3 text-left font-medium">Position</th>
                  <th className="px-4 py-3 text-left font-medium">Stage</th>
                  <th className="px-4 py-3 text-left font-medium">Location</th>
                  <th className="px-4 py-3 text-left font-medium">Applied</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/applications/${app.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{app.company}</td>
                    <td className="px-4 py-3 text-muted-foreground">{app.position}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", STAGE_COLORS[app.stage])}>
                        {STAGE_LABELS[app.stage]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{app.location || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{app.applied_date || "-"}</td>
                    <td className="px-4 py-3 text-right">
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * data.size + 1}-{Math.min(page * data.size, data.total)} of{" "}
                {data.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * data.size >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
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
