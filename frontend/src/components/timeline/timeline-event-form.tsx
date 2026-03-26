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
import type { TimelineEventCreate } from "@/api/timeline"

const EVENT_TYPES = [
  { value: "applied", label: "Applied" },
  { value: "phone_screen", label: "Phone Screen" },
  { value: "technical_interview", label: "Technical Interview" },
  { value: "behavioral_interview", label: "Behavioral Interview" },
  { value: "onsite", label: "Onsite" },
  { value: "take_home", label: "Take Home" },
  { value: "offer", label: "Offer" },
  { value: "rejection", label: "Rejection" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "follow_up", label: "Follow Up" },
  { value: "other", label: "Other" },
] as const

const schema = z.object({
  event_type: z.string().min(1, "Type is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  event_date: z.string().min(1, "Date is required"),
})

type FormValues = z.infer<typeof schema>

interface TimelineEventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TimelineEventCreate) => void
  loading?: boolean
}

export function TimelineEventForm({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: TimelineEventFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      event_type: "other",
      title: "",
      description: "",
      event_date: new Date().toISOString().slice(0, 16),
    },
  })

  const onFormSubmit: SubmitHandler<FormValues> = (data) => {
    onSubmit({
      event_type: data.event_type,
      title: data.title,
      description: data.description || null,
      event_date: new Date(data.event_date).toISOString(),
    })
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Add Timeline Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_type">Type *</Label>
              <Select id="event_type" {...register("event_type")}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              {errors.event_type && (
                <p className="text-xs text-destructive">{errors.event_type.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date">Date *</Label>
              <Input id="event_date" type="datetime-local" {...register("event_date")} />
              {errors.event_date && (
                <p className="text-xs text-destructive">{errors.event_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register("title")} placeholder="Phone screen with recruiter" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Details about this event..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
