"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, Mail, Check, X } from "lucide-react"

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
}

export function InviteDialog({ open, onOpenChange, documentId }: InviteDialogProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleInvite = async () => {
    if (!email.trim()) return
    setStatus("sending")
    setMessage("")

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, email: email.trim() }),
      })

      if (res.ok) {
        setStatus("success")
        setMessage("Collaborator added!")
        setEmail("")
      } else {
        const data = await res.json()
        setStatus("error")
        setMessage(data.error || "Failed to invite user")
      }
    } catch {
      setStatus("error")
      setMessage("Network error")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Collaborator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400 shrink-0" />
            <Input
              placeholder="Enter email address..."
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus("idle") }}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              disabled={status === "sending"}
            />
          </div>

          {message && (
            <div className={`flex items-center gap-2 text-sm p-2 rounded ${
              status === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {status === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {message}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleInvite}
            disabled={!email.trim() || status === "sending"}
          >
            {status === "sending" ? "Sending..." : "Invite"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
