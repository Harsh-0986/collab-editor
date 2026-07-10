"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  localDb,
  getLocalDocument,
  getLocalSnapshots,
  type LocalDocument,
  type LocalSnapshot,
} from "@/lib/local-db"
import { syncEngine, type SyncStatus } from "@/lib/sync-engine"
import useSocketHook from "./use-socket"

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
  const { emit, on } = useSocketHook(documentId)

  useEffect(() => {
    if (!documentId) {
      setLoading(false)
      return
    }

    let cancelled = false
    const docId: string = documentId

    async function load() {
      try {
        setLoading(true)
        syncEngine.trackDocument(docId)
        let local = await getLocalDocument(docId)
        if (!local) {
          await syncEngine.pullDocument(docId)
          local = await getLocalDocument(docId)
        }
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

    const unsubContent = on("document:updated", async ({ content, title, version }) => {
      if (cancelled) return
      const d = await getLocalDocument(docId)
      if (d && version > d.version) {
        if (d.isDirty) {
          await localDb.documents.put({ ...d, version, updatedAt: Date.now() })
          setDoc((prev) => prev ? { ...prev, version } : null)
        } else {
          await localDb.documents.put({ ...d, content, title, version, updatedAt: Date.now(), isDirty: false })
          setDoc((prev) => prev ? { ...prev, content, title, version } : null)
        }
      }
    })

    const unsubTitle = on("document:title:updated", async ({ title }) => {
      if (cancelled) return
      const d = await getLocalDocument(docId)
      if (d) {
        await localDb.documents.put({ ...d, title, updatedAt: Date.now(), isDirty: d.isDirty })
        setDoc((prev) => prev ? { ...prev, title } : null)
      }
    })

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
      unsubContent()
      unsubTitle()
      syncEngine.untrackDocument(docId)
    }
  }, [documentId, on])

  const updateTitle = useCallback(
    async (title: string) => {
      if (!doc || !documentId) return
      await syncEngine.updateDocumentContent(documentId, doc.content, title)
      emit("document:title:update", { documentId, title })
      setDoc((prev) => (prev ? { ...prev, title, updatedAt: Date.now() } : null))
    },
    [doc, documentId, emit],
  )

  const updateContent = useCallback(
    async (content: string) => {
      if (!doc || !documentId) return
      pendingOps.current += 1
      await syncEngine.updateDocumentContent(documentId, content, doc.title)
      emit("document:update", { documentId, content, title: doc.title, version: doc.version + 1 })
      setDoc((prev) => (prev ? { ...prev, content, version: prev.version + 1, updatedAt: Date.now() } : null))
      pendingOps.current -= 1
    },
    [doc, documentId, emit],
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
      await syncEngine.fetchDocuments()
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
