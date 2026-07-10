"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { queueRepository, operationRepository, documentRepository, metadataRepository } from "@/lib/dexie"
import type { ConnectionState, SyncPayload, SyncResponse, StoredOperation } from "@/types"

export interface UseSyncOptions {
  onRemoteOps?: (ops: Array<{ payload: Record<string, unknown> }>) => void
}

const MAX_RETRIES = 5
const SYNC_INTERVAL = 5000

export function useSync(documentId?: string, options: UseSyncOptions = {}) {
  const [syncing, setSyncing] = useState(false)
  const [queueLength, setQueueLength] = useState(0)
  const [connectionState, setConnectionState] = useState<ConnectionState>("online")
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const workerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const syncingRef = useRef(false)

  useEffect(() => {
    const updateQueue = async () => {
      const count = documentId
        ? await queueRepository.count(documentId)
        : await queueRepository.count()
      setQueueLength(count)
    }

    updateQueue()
    const interval = setInterval(updateQueue, 2000)
    return () => clearInterval(interval)
  }, [documentId])

  useEffect(() => {
    const handleOnline = () => setConnectionState("online")
    const handleOffline = () => setConnectionState("offline")
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const sync = useCallback(async () => {
    if (syncingRef.current || connectionState === "offline") return

    const items = documentId
      ? await queueRepository.getAllByDocument(documentId)
      : await queueRepository.getAll()

    if (items.length === 0) return

    syncingRef.current = true
    setSyncing(true)

    try {
      const doc = documentId ? await documentRepository.findById(documentId) : null
      if (!doc && documentId) {
        syncingRef.current = false
        setSyncing(false)
        return
      }

      const batch = items.slice(0, 50)
      const baseVersion = doc?.currentVersion ?? 1
      const clientId = (await metadataRepository.get("clientId")) as string || "browser"

      const payload: SyncPayload = {
        documentId: documentId || batch[0].documentId,
        clientId,
        baseVersion,
        operations: batch.map((item) => ({
          id: item.operation.id,
          lamport: item.operation.lamport,
          timestamp: item.operation.timestamp,
          type: item.operation.type,
          payload: item.operation.payload,
          checksum: item.operation.checksum,
        })),
      }

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`Sync failed: ${res.status}`)
      }

      const response = await res.json()
      console.log("[sync] raw response:", response)
      const data = response.data || response

      console.log("[sync] batch size:", batch.length, "baseVersion:", baseVersion, "serverVersion:", data.serverVersion)
      console.log("[sync] acknowledged:", data.acknowledged.length, "operations:", data.acknowledged)
      console.log("[sync] new operations:", data.operations?.length || 0)

      // Only clear if ALL batch items were acknowledged
      if (data.acknowledged.length === batch.length && batch.length > 0) {
        console.log("[sync] all batch items acknowledged, clearing queue for document:", payload.documentId)
        await queueRepository.clear(payload.documentId)
      } else if (data.acknowledged.length > 0) {
        // Partial: remove only acknowledged items
        console.log("[sync] partial ack, removing acknowledged items:", data.acknowledged)
        for (const opId of data.acknowledged) {
          const item = batch.find((i) => i.operationId === opId)
          if (item && item.id != null) {
            await queueRepository.remove(item.id)
            await operationRepository.update(opId, { status: "SYNCED" })
          }
        }
      }

      // Update queue count immediately after successful sync
      const newCount = documentId
        ? await queueRepository.count(documentId)
        : await queueRepository.count()
      console.log("[sync] new queue count:", newCount)
      setQueueLength(newCount)

      if (data.operations && data.operations.length > 0) {
        for (const remoteOp of data.operations) {
          const existing = await operationRepository.findByLamportAfter(
            payload.documentId,
            remoteOp.lamport - 1
          )
          const isDuplicate = existing.some((e) => e.checksum === remoteOp.checksum)
          if (!isDuplicate) {
            const op: StoredOperation = {
              id: remoteOp.id,
              documentId: payload.documentId,
              clientId: remoteOp.id,
              authorId: "",
              lamport: remoteOp.lamport,
              timestamp: remoteOp.timestamp,
              type: remoteOp.type as StoredOperation["type"],
              payload: remoteOp.payload,
              checksum: remoteOp.checksum,
              status: "SYNCED",
              retryCount: 0,
              createdAt: remoteOp.timestamp,
            }
            await operationRepository.create(op)
          }
        }

        // Apply remote operations to local document content
        if (options.onRemoteOps) {
          options.onRemoteOps(data.operations)
        }
      }

      if (data.serverVersion > baseVersion) {
        await documentRepository.update(payload.documentId, {
          currentVersion: data.serverVersion,
        })
      }

      setRetryCount(0)
      setLastSync(data.serverTime || new Date().toISOString())
    } catch {
      setRetryCount((prev) => Math.min(prev + 1, MAX_RETRIES))
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [documentId, connectionState])

  useEffect(() => {
    if (connectionState === "offline") return

    workerRef.current = setInterval(() => {
      sync()
    }, SYNC_INTERVAL)

    return () => {
      if (workerRef.current) clearInterval(workerRef.current)
    }
  }, [sync, connectionState])

  const forceSync = useCallback(async () => {
    await sync()
  }, [sync])

  return {
    syncing,
    queueLength,
    connectionState,
    lastSync,
    retryCount,
    forceSync,
  }
}
