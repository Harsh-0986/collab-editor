"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { SyncIndicator } from "@/components/sync/sync-indicator"
import { DevDiagnosticsPanel } from "@/components/sync/dev-diagnostics"
import { useConnection } from "@/hooks/use-connection"
import { useSync } from "@/hooks/use-sync"
import { documentRepository } from "@/lib/dexie"
import { LogOut, Plus, FileText, Trash2, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "@/lib/utils"
import type { StoredDocument } from "@/types"

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { state: connectionState } = useConnection()
  const { syncing, queueLength, retryCount, lastSync, forceSync } = useSync()
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState("")
  const [creating, setCreating] = useState(false)

  const loadDocuments = async () => {
    try {
      // Fetch from server first (for cross-browser visibility)
      const res = await fetch("/api/documents", { credentials: "include" })
      const data = await res.json()
      if (data.success && data.data.length > 0) {
        // Sync server docs to IndexedDB
        for (const doc of data.data) {
          const existing = await documentRepository.findById(doc.id)
          if (!existing) {
            await documentRepository.create({
              id: doc.id,
              title: doc.title,
              ownerId: doc.ownerId,
              ownerName: doc.ownerName,
              currentVersion: doc.currentVersion,
              content: { type: "doc", content: [{ type: "paragraph", content: [] }] },
              archived: doc.archived,
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
            })
          }
        }
        setDocuments(data.data)
      } else {
        // Fallback to local IndexedDB
        const local = await documentRepository.findAll()
        setDocuments(local)
      }
    } catch {
      // Offline fallback
      const local = await documentRepository.findAll()
      setDocuments(local)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])
    const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newTitle.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Failed to create")

      const now = new Date().toISOString()
      const doc: StoredDocument = {
        id: data.data.documentId,
        title: newTitle.trim(),
        ownerId: session?.user?.id || "",
        ownerName: session?.user?.name || undefined,
        currentVersion: 1,
        content: { type: "doc", content: [{ type: "paragraph", content: [] }] },
        archived: false,
        createdAt: now,
        updatedAt: now,
      }

      await documentRepository.create(doc)
      await loadDocuments()
      setNewTitle("")
      router.push(`/editor/${doc.id}`)
    } catch (e) {
      console.error("Create failed:", e)
      alert("Failed to create document")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      await documentRepository.delete(id)
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    } catch (e) {
      console.error("Delete failed:", e)
      alert("Failed to delete document")
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">SyncPad</h1>
          <div className="flex items-center gap-3">
            {connectionState === "online" ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <SyncIndicator
              connectionState={connectionState}
              syncing={syncing}
              queueLength={queueLength}
            />
            <span className="text-sm text-zinc-500">{session?.user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs">
              <LogOut className="h-3 w-3 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-base">New Document</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4 pt-0">
            <form
              onSubmit={(e) => { e.preventDefault(); handleCreate() }}
              className="flex gap-3"
            >
              <Input
                placeholder="Document title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={100}
                className="flex-1"
              />
              <Button type="submit" disabled={creating || !newTitle.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Recent Documents</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                <p className="text-zinc-500">No documents yet</p>
                <p className="text-sm text-zinc-400 mt-1">Create your first document above</p>
              </CardContent>
            </Card>
          ) : (
            documents.map((doc) => (
              <Card
                key={doc.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/editor/${doc.id}`)}
              >
                <CardContent className="py-4 px-6 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{doc.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span>{formatDistanceToNow(new Date(doc.updatedAt))}</span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        v{doc.currentVersion}
                      </Badge>
                      {doc.ownerName && (
                        <span>{doc.ownerName}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 ml-2 text-zinc-400 hover:text-red-500"
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.id) }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      <DevDiagnosticsPanel
        connection={connectionState}
        queueLength={queueLength}
        syncing={syncing}
        retryCount={retryCount}
        lastSync={lastSync}
        onForceSync={forceSync}
      />
    </div>
  )
}
