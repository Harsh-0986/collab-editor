"use client"

import { Badge } from "@/components/ui/badge"
import type { ConnectionState } from "@/types"

interface SyncIndicatorProps {
  connectionState: ConnectionState
  syncing: boolean
  queueLength: number
}

export function SyncIndicator({ connectionState, syncing, queueLength }: SyncIndicatorProps) {
  const getColor = () => {
    if (connectionState === "offline") return "destructive"
    if (syncing) return "warning"
    if (queueLength > 0) return "warning"
    return "success"
  }

  const getLabel = () => {
    if (connectionState === "offline") return "Offline"
    if (syncing) return "Syncing"
    if (queueLength > 0) return `${queueLength} pending`
    return "Synced"
  }

  return (
    <Badge variant={getColor()} className="gap-1">
      <span className={`h-2 w-2 rounded-full ${
        connectionState === "offline" ? "bg-red-500" :
        syncing ? "bg-yellow-500 animate-pulse" :
        "bg-green-500"
      }`} />
      {getLabel()}
    </Badge>
  )
}
