"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLocalSnapshots, useLocalDocument } from "@/hooks/use-local-document"
import { Clock, RotateCcw, User, FileText, History } from "lucide-react"
import { format } from "date-fns"

interface HistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
}

export function HistoryDialog({ open, onOpenChange, documentId }: HistoryDialogProps) {
  const { snapshots, loading } = useLocalSnapshots(documentId)
  const { doc, updateContent } = useLocalDocument(documentId)

  const handleRestore = async (version: number) => {
    const snapshot = snapshots.find((s) => s.version === version)
    if (!snapshot) return

    try {
      const response = await fetch(
        `/api/documents/${documentId}/versions/${version}/restore`,
        { method: "POST" },
      )
      if (response.ok) {
        const data = await response.json()
        await updateContent(data.content)
      }
    } catch {
      if (snapshot) {
        await updateContent(snapshot.content)
      }
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {doc && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-800">Current Version</p>
                  <p className="text-sm text-blue-600">
                    v{doc.version} · Last saved{" "}
                    {format(doc.updatedAt, "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-500">Loading history...</div>
          )}

          {!loading && snapshots.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No saved versions yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Save a snapshot to track document history
              </p>
            </div>
          )}

          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-600">
                      v{snap.version} ·{" "}
                      {format(snap.createdAt, "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  {snap.title && (
                    <p className="text-sm font-medium text-gray-900 mb-1 truncate">
                      {snap.title}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 line-clamp-2">
                    {snap.content
                      ? snap.content.replace(/<[^>]+>/g, "").slice(0, 150)
                      : "Empty"}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 shrink-0"
                  onClick={() => handleRestore(snap.version)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}