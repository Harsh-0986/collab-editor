"use client"

import { useCallback, useEffect, useState } from "react"
import { snapshotRepository, documentRepository } from "@/lib/dexie"
import type { StoredSnapshot, VersionInfo } from "@/types"

export function useVersions(documentId?: string) {
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [selectedVersion, setSelectedVersion] = useState<StoredSnapshot | null>(null)
  const [loading, setLoading] = useState(false)

  const loadFromServer = useCallback(async () => {
    if (!documentId) return
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`, { credentials: "include" })
      const data = await res.json()
      if (data.success && data.data) {
        const serverVersions: VersionInfo[] = data.data.map((v: any) => ({
          version: v.version,
          createdAt: v.createdAt,
          createdBy: v.createdBy,
          reason: v.reason,
        }))
        setVersions(serverVersions)
        // Also sync to IndexedDB
        for (const v of serverVersions) {
          const snap = await snapshotRepository.findVersion(documentId, v.version)
          if (!snap) {
            await snapshotRepository.create({
              id: crypto.randomUUID(),
              documentId,
              version: v.version,
              snapshot: { type: "doc", content: [] },
              createdBy: v.createdBy,
              reason: v.reason,
              createdAt: v.createdAt,
            })
          }
        }
      }
    } catch (e) {
      console.error("Server versions load failed:", e)
    }
  }, [documentId])

  const loadVersions = useCallback(async () => {
    if (!documentId) return
    setLoading(true)
    const snaps = await snapshotRepository.findByDocument(documentId)
    if (snaps.length > 0) {
      setVersions(
        snaps.map((s) => ({
          version: s.version,
          createdAt: s.createdAt,
          createdBy: s.createdBy,
          reason: s.reason,
        }))
      )
      setLoading(false)
    } else {
      // Local empty, try server
      await loadFromServer()
      setLoading(false)
    }
  }, [documentId, loadFromServer])

  useEffect(() => {
    if (!documentId) return
    loadVersions()
  }, [documentId, loadVersions])

  const previewVersion = useCallback(async (version: number) => {
    if (!documentId) return null
    const snap = await snapshotRepository.findVersion(documentId, version)
    if (snap) setSelectedVersion(snap)
    return snap || null
  }, [documentId])

  const restoreVersion = useCallback(async (version: number): Promise<void> => {
    if (!documentId) return

    const snap = await snapshotRepository.findVersion(documentId, version)
    if (!snap) return

    const doc = await documentRepository.findById(documentId)
    if (!doc) return

    const newVersion = (doc.currentVersion || 0) + 1
    const now = new Date().toISOString()

    const restoredSnapshot: StoredSnapshot = {
      id: crypto.randomUUID(),
      documentId,
      version: newVersion,
      snapshot: snap.snapshot,
      createdBy: snap.createdBy,
      reason: "RESTORE",
      createdAt: now,
    }

    await snapshotRepository.create(restoredSnapshot)
    await documentRepository.update(documentId, {
      currentVersion: newVersion,
      content: snap.snapshot as Record<string, unknown>,
      updatedAt: now,
    })

    await loadVersions()
  }, [documentId, loadVersions])

  const createSnapshot = useCallback(async (
    reason: "MANUAL" | "AUTO" = "AUTO"
  ) => {
    if (!documentId) return

    const doc = await documentRepository.findById(documentId)
    if (!doc) return

    const newVersion = (doc.currentVersion || 0) + 1
    const now = new Date().toISOString()

    const snap: StoredSnapshot = {
      id: crypto.randomUUID(),
      documentId,
      version: newVersion,
      snapshot: (doc.content || {}) as Record<string, unknown>,
      createdBy: "",
      reason,
      createdAt: now,
    }

    await snapshotRepository.create(snap)
    await documentRepository.update(documentId, {
      currentVersion: newVersion,
      updatedAt: now,
    })

    await loadVersions()
    return snap
  }, [documentId, loadVersions])

  return {
    versions,
    selectedVersion,
    loading,
    previewVersion,
    restoreVersion,
    createSnapshot,
    loadVersions,
  }
}
