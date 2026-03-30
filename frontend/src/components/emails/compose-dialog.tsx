import { useState } from "react"
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
import { Send } from "lucide-react"

interface ComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (to: string, subject: string, body: string) => void
  loading?: boolean
  // Pre-fill for reply
  replyTo?: string
  replySubject?: string
  replyBody?: string
}

export function ComposeDialog({
  open,
  onOpenChange,
  onSend,
  loading,
  replyTo,
  replySubject,
  replyBody,
}: ComposeDialogProps) {
  const [to, setTo] = useState(replyTo || "")
  const [subject, setSubject] = useState(replySubject || "")
  const [body, setBody] = useState(replyBody || "")

  const handleSend = () => {
    if (!to.trim() || !subject.trim()) return
    onSend(to.trim(), subject.trim(), body)
  }

  // Reset fields when dialog opens with new pre-fill values
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTo(replyTo || "")
      setSubject(replySubject || "")
      setBody(replyBody || "")
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{replyTo ? "Reply" : "Compose Email"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input id="to" value={to} onChange={(e) => setTo(e.target.value)}
              placeholder="email@example.com" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="subject" className="text-xs">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="body" className="text-xs">Message</Label>
            <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..." rows={8} className="text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={!to.trim() || !subject.trim() || loading} onClick={handleSend}>
              <Send className="h-4 w-4" />
              {loading ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
