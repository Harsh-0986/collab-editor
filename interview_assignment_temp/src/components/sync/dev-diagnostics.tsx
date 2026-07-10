"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bug, X } from "lucide-react"
import { metadataRepository } from "@/lib/dexie"
import type { ConnectionState } from "@/types"

interface DevDiagnosticsProps {
  connection: ConnectionState
  queueLength: number
  syncing: boolean
  retryCount: number
  lastSync: string | null
  onForceSync: () => void
}

export function DevDiagnosticsPanel({
  connection,
  queueLength,
  syncing,
  retryCount,
  lastSync,
  onForceSync,
}: DevDiagnosticsProps) {
  const [open, setOpen] = useState(false)
  const [clientId, setClientId] = useState("")
  const [lamport, setLamport] = useState(0)

  useEffect(() => {
    metadataRepository.get("clientId").then((id) => {
      if (id) setClientId(id as string)
    })
    metadataRepository.get("lamport").then((l) => {
      if (l) setLamport(l as number)
    })
  }, [])

  if (process.env.NODE_ENV === "production" && !open) return null

  return (
    <>
      {!open && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 z-50 h-8 w-8 opacity-50 hover:opacity-100"
          onClick={() => setOpen(true)}
          title="Developer Diagnostics"
        >
          <Bug className="h-4 w-4" />
        </Button>
      )}
      {open && (
        <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-lg border-zinc-300 dark:border-zinc-600">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-sm font-mono">Dev Diagnostics</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-500">Connection:</span>
              <Badge variant={
                connection === "online" ? "success" :
                connection === "offline" ? "destructive" : "warning"
              } className="text-[10px] px-1.5 py-0">
                {connection}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Queue:</span>
              <span>{queueLength}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Syncing:</span>
              <span>{syncing ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Lamport:</span>
              <span>{lamport}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Client ID:</span>
              <span className="truncate max-w-[120px]">{clientId.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Retries:</span>
              <span>{retryCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Last Sync:</span>
              <span>{lastSync ? new Date(lastSync).toLocaleTimeString() : "Never"}</span>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs" onClick={onForceSync}>
              Force Sync
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  )
}
