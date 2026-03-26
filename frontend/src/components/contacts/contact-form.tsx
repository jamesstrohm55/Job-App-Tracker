import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Contact } from "@/types"
import type { ContactCreate } from "@/api/contacts"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  linkedin_url: z.string().url("Invalid URL").or(z.literal("")).optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ContactFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ContactCreate) => void
  contact?: Contact
  loading?: boolean
}

export function ContactForm({
  open,
  onOpenChange,
  onSubmit,
  contact,
  loading,
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: contact?.name ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      role: contact?.role ?? "",
      company: contact?.company ?? "",
      linkedin_url: contact?.linkedin_url ?? "",
      notes: contact?.notes ?? "",
    },
  })

  const onFormSubmit: SubmitHandler<FormValues> = (data) => {
    onSubmit({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      role: data.role || null,
      company: data.company || null,
      linkedin_url: data.linkedin_url || null,
      notes: data.notes || null,
    })
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name")} placeholder="Jane Smith" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" {...register("role")} placeholder="Recruiter" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="jane@company.com" />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} placeholder="+1 555-0123" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" {...register("company")} placeholder="Google" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input id="linkedin_url" {...register("linkedin_url")} placeholder="https://linkedin.com/in/..." />
              {errors.linkedin_url && (
                <p className="text-xs text-destructive">{errors.linkedin_url.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Notes about this contact..." rows={2} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : contact ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
