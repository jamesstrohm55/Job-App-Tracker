import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/constants"
import type { Application } from "@/types"
import type { ApplicationCreate } from "@/api/applications"

const schema = z.object({
  company: z.string().min(1, "Company is required"),
  position: z.string().min(1, "Position is required"),
  url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  location: z.string().optional(),
  work_model: z.enum(["remote", "hybrid", "onsite", ""]).optional(),
  salary_min: z.coerce.number().int().positive().optional().or(z.literal(0)),
  salary_max: z.coerce.number().int().positive().optional().or(z.literal(0)),
  stage: z.enum(STAGES),
  notes: z.string().optional(),
  applied_date: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ApplicationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ApplicationCreate) => void
  defaultValues?: Partial<FormValues>
  defaultStage?: Stage
  loading?: boolean
  application?: Application
}

export function ApplicationForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  defaultStage,
  loading,
  application,
}: ApplicationFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      company: application?.company ?? defaultValues?.company ?? "",
      position: application?.position ?? defaultValues?.position ?? "",
      url: application?.url ?? defaultValues?.url ?? "",
      location: application?.location ?? defaultValues?.location ?? "",
      work_model: application?.work_model ?? defaultValues?.work_model ?? "",
      salary_min: application?.salary_min ?? defaultValues?.salary_min ?? undefined,
      salary_max: application?.salary_max ?? defaultValues?.salary_max ?? undefined,
      stage: application?.stage ?? defaultStage ?? "saved",
      notes: application?.notes ?? defaultValues?.notes ?? "",
      applied_date: application?.applied_date ?? defaultValues?.applied_date ?? "",
    },
  })

  const onFormSubmit: SubmitHandler<FormValues> = (data) => {
    onSubmit({
      company: data.company,
      position: data.position,
      url: data.url || null,
      location: data.location || null,
      work_model: (data.work_model || null) as ApplicationCreate["work_model"],
      salary_min: data.salary_min || null,
      salary_max: data.salary_max || null,
      stage: data.stage,
      notes: data.notes || null,
      applied_date: data.applied_date || null,
    })
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {application ? "Edit Application" : "Add Application"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input id="company" {...register("company")} placeholder="Google" />
              {errors.company && (
                <p className="text-xs text-destructive">{errors.company.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input id="position" {...register("position")} placeholder="Software Engineer" />
              {errors.position && (
                <p className="text-xs text-destructive">{errors.position.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Job URL</Label>
            <Input id="url" {...register("url")} placeholder="https://..." />
            {errors.url && (
              <p className="text-xs text-destructive">{errors.url.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register("location")} placeholder="San Francisco, CA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_model">Work Model</Label>
              <Select id="work_model" {...register("work_model")}>
                <option value="">Select...</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary_min">Salary Min</Label>
              <Input
                id="salary_min"
                type="number"
                {...register("salary_min")}
                placeholder="80000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_max">Salary Max</Label>
              <Input
                id="salary_max"
                type="number"
                {...register("salary_max")}
                placeholder="120000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select id="stage" {...register("stage")}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="applied_date">Applied Date</Label>
              <Input id="applied_date" type="date" {...register("applied_date")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Any notes..." rows={3} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : application ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
