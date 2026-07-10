"use client"

import { use, useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "@/lib/auth-client"
import { DocumentEditor } from "@/components/editor/editor"
import { SyncIndicator } from "@/components/sync/sync-indicator"
import { VersionTimeline } from "@/components/versions/version-timeline"
import { AIPanel } from "@/components/editor/ai-panel"
import { DevDiagnosticsPanel } from "@/components/sync/dev-diagnostics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { useDocument } from "@/hooks/use-document"
import { useConnection } from "@/hooks/use-connection"
import { useSync } from "@/hooks/use-sync"
import { useVersions } from "@/hooks/use-versions"
import { metadataRepository } from "@/lib/dexie"
import { ArrowLeft, LogOut, Save, Sparkles, History, Wifi, WifiOff, UserPlus } from "lucide-react"
import type { StoredOperation } from "@/types"
import RealtimeEditor from "@/components/editor/realtime-editor"
import CollaborationStatus from "@/components/editor/collaboration-status"

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const { document: doc, loading: docLoading, saveContent, addOperation } = useDocument(id)
  const { state: connectionState } = useConnection()
  const { syncing, queueLength, retryCount, lastSync, forceSync } = useSync(id, {
    onRemoteOps: (remoteOps) => {
      // Remote operations are now handled by the real-time collaboration system
      // The RealtimeEditor will receive updates via WebSocket
    },
  })
  const { versions, loading: versionsLoading, previewVersion, restoreVersion, createSnapshot } = useVersions(id)
  const [lamport, setLamport] = useState(0)
  const [showAI, setShowAI] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"EDITOR" | "VIEWER">("EDITOR")
  const [inviteLoading, setInviteLoading] = useState(false)
  const latestContentRef = useRef<Record<string, unknown> | null>(null)

  useEffect(() => {
    metadataRepository.get("lamport").then((l) => {
      if (typeof l === "number") setLamport(l)
    })
  }, [])

  const handleContentChange = useCallback((content: Record<string, unknown>) => {
    latestContentRef.current = content
  }, [])

  const handleOperation = useCallback(async (
    type: string,
    payload: Record<string, unknown>,
    newLamport: number
  ) => {
    setLamport(newLamport)
    await metadataRepository.set("lamport", newLamport)

    const clientId = session?.user?.id || "browser"
    await addOperation(id, clientId, type as StoredOperation["type"], payload, newLamport)
  }, [id, session, addOperation])

  useEffect(() => {
    const timer = setInterval(async () => {
      if (latestContentRef.current) {
        await saveContent(id, latestContentRef.current)

        const lamportVal = await metadataRepository.get("lamport") as number
        if (lamportVal % 20 === 0 || !lamportVal) {
          await createSnapshot("AUTO")
        }
      }
    }, 30000)

    return () => clearInterval(timer)
  }, [id, saveContent, createSnapshot])

  const handleManualSave = async () => {
    if (latestContentRef.current) {
      await saveContent(id, latestContentRef.current)
      await createSnapshot("MANUAL")
    }
  }



  const role = doc?.role
  const isReadOnly = role === "VIEWER"

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-medium truncate max-w-[200px] sm:max-w-[400px]">
              {doc?.title || "Loading..."}
            </h1>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              {connectionState === "online" ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              {doc?.ownerName && <span>{doc.ownerName}</span>}
              {role && (
                <span className="uppercase text-[10px] font-mono text-zinc-400">{role}</span>
              )}
            </div>
          </div>
        </div>

            <div className="flex items-center gap-2">
              {doc && (
                <CollaborationStatus
                  documentId={doc.id}
                  userId={session?.user?.id || ""}
                  userName={session?.user?.name || "You"}
                  onInvite={() => setShowInviteDialog(true)}
                />
              )}
              {!isReadOnly && (
                <>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleManualSave}>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowHistory(!showHistory)}>
                    <History className="h-3 w-3 mr-1" />
                    History
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowAI(!showAI)}>
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-900">
          {docLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-zinc-500">Loading document...</p>
            </div>
          ) : (
            <RealtimeEditor
              document={doc}
              onContentChange={handleContentChange}
              onOperation={handleOperation}
              readOnly={isReadOnly}
              currentLamport={lamport}
              userId={session?.user?.id}
              userName={session?.user?.name || "You"}
            />
          )}
        </div>

        {(showHistory || showAI) && (
          <aside className="w-80 border-l border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-y-auto shrink-0">
            <div className="p-4 space-y-4">
              {showHistory && (
                <VersionTimeline
                  versions={versions}
                  loading={versionsLoading}
                  onPreview={previewVersion}
                  onRestore={restoreVersion}
                  canRestore={!isReadOnly}
                />
              )}
              {showAI && (
                <AIPanel
                  documentContent={JSON.stringify(doc?.content || {})}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      <DevDiagnosticsPanel
        connection={connectionState}
        queueLength={queueLength}
        syncing={syncing}
        retryCount={retryCount}
        lastSync={lastSync}
        onForceSync={forceSync}
      />

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            <UserPlus className="h-3 w-3 mr-1" />
            Invite
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Invite Collaborator</DialogTitle>
            <DialogDescription>Enter their email to invite them to this document</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="collaborator@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="EDITOR"
                    checked={inviteRole === "EDITOR"}
                    onChange={() => setInviteRole("EDITOR")}
                    className="w-4 h-4"
                  />
                  <span>Editor (can edit)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="VIEWER"
                    checked={inviteRole === "VIEWER"}
                    onChange={() => setInviteRole("VIEWER")}
                    className="w-4 h-4"
                  />
                  <span>Viewer (read-only)</span>
                </label>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                setInviteLoading(true)
                try {
                  const res = await fetch(`/api/documents/${id}/members`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
                  })
                  const data = await res.json()
                  if (data.success) {
                    setShowInviteDialog(false)
                    setInviteEmail("")
                  } else {
                    alert(data.error?.message || "Failed to invite")
                  }
                } catch {
                  alert("Failed to invite")
                } finally {
                  setInviteLoading(false)
                }
              }}
              disabled={inviteLoading || !inviteEmail}
            >
              {inviteLoading ? "Inviting..." : "Send Invite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
