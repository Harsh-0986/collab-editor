"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Clock, RotateCcw, Eye } from "lucide-react"
import { formatDistanceToNow } from "@/lib/utils"
import type { VersionInfo, StoredSnapshot } from "@/types"

interface VersionTimelineProps {
  versions: VersionInfo[]
  loading: boolean
  onPreview: (version: number) => Promise<StoredSnapshot | null>
  onRestore: (version: number) => Promise<void>
  canRestore?: boolean
}

export function VersionTimeline({ versions, loading, onPreview, onRestore, canRestore = true }: VersionTimelineProps) {
  const [previewSnap, setPreviewSnap] = useState<StoredSnapshot | null>(null)
  const [restoreVersion, setRestoreVersion] = useState<number | null>(null)

  const handlePreview = async (version: number) => {
    const snap = await onPreview(version)
    if (snap) setPreviewSnap(snap)
  }

  const handleRestore = async () => {
    if (restoreVersion == null) return
    await onRestore(restoreVersion)
    setRestoreVersion(null)
  }

  return (
    <>
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-zinc-500">No versions yet</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {versions.map((v) => (
                <div key={v.version} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <div>
                    <span className="text-sm font-mono">v{v.version}</span>
                    <span className="text-xs text-zinc-500 ml-2">
                      {formatDistanceToNow(new Date(v.createdAt))}
                    </span>
                    <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">
                      {v.reason}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handlePreview(v.version)} title="Preview">
                      <Eye className="h-3 w-3" />
                    </Button>
                    {canRestore && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRestoreVersion(v.version)} title="Restore">
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewSnap} onOpenChange={(open) => !open && setPreviewSnap(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version {previewSnap?.version}</DialogTitle>
            <DialogDescription>
              Created {previewSnap?.createdAt ? new Date(previewSnap.createdAt).toLocaleString() : ""}
              {" "}({previewSnap?.reason})
            </DialogDescription>
          </DialogHeader>
          <pre className="text-xs bg-zinc-50 dark:bg-zinc-800 p-4 rounded overflow-x-auto max-h-96">
            {JSON.stringify(previewSnap?.snapshot, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>

      <Dialog open={restoreVersion != null} onOpenChange={(open) => !open && setRestoreVersion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version v{restoreVersion}</DialogTitle>
            <DialogDescription>
              This will create a new snapshot. Previous history is preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreVersion(null)}>Cancel</Button>
            <Button onClick={handleRestore}>Restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
