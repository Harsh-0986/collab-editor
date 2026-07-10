"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  localDb,
  getLocalDocument,
  getLocalSnapshots,
  type LocalDocument,
  type LocalSnapshot,
  type SyncQueueItem,
} from "@/lib/local-db"
import { syncEngine, type SyncStatus } from "@/lib/sync-engine"
import { getLamportTimestamp } from "@/lib/conflict-resolver"

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("idle")

  useEffect(() => {
    const unsub = syncEngine.subscribe(setStatus)
    syncEngine.start()
    return () => {
      unsub()
      syncEngine.stop()
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => syncEngine.setOnline(true)
    const handleOffline = () => syncEngine.setOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    syncEngine.setOnline(navigator.onLine)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return status
}

export function useLocalDocument(documentId: string | undefined) {
  const [doc, setDoc] = useState<LocalDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pendingOps = useRef(0)

  useEffect(() => {
    if (!documentId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const local = documentId ? await getLocalDocument(documentId) : undefined
        if (!cancelled) {
          if (local) {
            setDoc(local)
          }
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load document")
          setLoading(false)
        }
      }
    }

    load()

    const interval = setInterval(async () => {
      if (cancelled || !documentId) return
      try {
        const local = await getLocalDocument(documentId)
        if (local && !cancelled) {
          setDoc(local)
        }
      } catch {
      }
    }, 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [documentId])

  const updateTitle = useCallback(
    async (title: string) => {
      if (!doc || !documentId) return
      await syncEngine.updateDocumentContent(documentId, doc.content, title)
      setDoc((prev) => (prev ? { ...prev, title, updatedAt: Date.now() } : null))
    },
    [doc, documentId],
  )

  const updateContent = useCallback(
    async (content: string) => {
      if (!doc || !documentId) return
      pendingOps.current += 1
      await syncEngine.updateDocumentContent(documentId, content, doc.title)
      setDoc((prev) => (prev ? { ...prev, content, version: prev.version + 1, updatedAt: Date.now() } : null))
      pendingOps.current -= 1
    },
    [doc, documentId],
  )

  const insertText = useCallback(
    async (position: number, text: string) => {
      if (!documentId) return
      pendingOps.current += 1
      await syncEngine.insertText(documentId, position, text)
      pendingOps.current -= 1
    },
    [documentId],
  )

  const deleteText = useCallback(
    async (position: number, length: number) => {
      if (!documentId) return
      pendingOps.current += 1
      await syncEngine.deleteText(documentId, position, length)
      pendingOps.current -= 1
    },
    [documentId],
  )

  const saveSnapshot = useCallback(
    async (title?: string) => {
      if (!doc || !documentId) return
      await syncEngine.createSnapshot(documentId, title || `v${doc.version}`, doc.content, doc.ownerId)
    },
    [doc, documentId],
  )

  return {
    doc,
    loading,
    error,
    pendingOps: pendingOps.current,
    updateTitle,
    updateContent,
    insertText,
    deleteText,
    saveSnapshot,
  }
}

export function useLocalSnapshots(documentId: string | undefined) {
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!documentId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      const snaps = documentId ? await getLocalSnapshots(documentId) : []
      if (!cancelled) {
        setSnapshots(snaps)
        setLoading(false)
      }
    }

    load()

    const interval = setInterval(async () => {
      if (cancelled || !documentId) return
      const snaps = await getLocalSnapshots(documentId)
      if (!cancelled) setSnapshots(snaps)
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [documentId])

  return { snapshots, loading }
}

export function useCreateDocument() {
  const [creating, setCreating] = useState(false)

  const create = useCallback(async (title: string, ownerId: string) => {
    setCreating(true)
    try {
      const doc = await syncEngine.createDocument(title, ownerId)
      return doc
    } finally {
      setCreating(false)
    }
  }, [])

  return { create, creating }
}

export function useDocumentList() {
  const [documents, setDocuments] = useState<LocalDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const docs = await localDb.documents.orderBy("updatedAt").reverse().toArray()
      if (!cancelled) {
        setDocuments(docs)
        setLoading(false)
      }
    }

    load()

    const interval = setInterval(async () => {
      if (cancelled) return
      const docs = await localDb.documents.orderBy("updatedAt").reverse().toArray()
      if (!cancelled) setDocuments(docs)
    }, 3000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { documents, loading }
}