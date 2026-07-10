"use client"

import { useCallback, useEffect, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { documentRepository, operationRepository, queueRepository } from "@/lib/dexie"
import type { StoredDocument, StoredOperation } from "@/types"

const DEFAULT_CONTENT = {
  type: "doc",
  content: [{ type: "paragraph", content: [] }],
}

export function useDocument(id?: string) {
  const [document, setDocument] = useState<StoredDocument | null>(null)
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    documentRepository.findAll().then((docs) => {
      setDocuments(docs)
      setLoading(false)
    })

    const interval = setInterval(async () => {
      const docs = await documentRepository.findAll()
      setDocuments(docs)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const loadFromServer = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, { credentials: "include" })
      const data = await res.json()
      if (data.success && data.data) {
        const doc: StoredDocument = {
          ...data.data,
          content: data.data.snapshot || DEFAULT_CONTENT,
        }
        await documentRepository.create(doc)
        setDocument(doc)
        return doc
      }
    } catch (e) {
      console.error("Server load failed:", e)
    }
    return null
  }, [])

  useEffect(() => {
    if (!id) return

    const load = async () => {
      setLoading(true)
      const [local, serverDoc] = await Promise.all([
        documentRepository.findById(id),
        loadFromServer(id),
      ])

      // Compare and use latest version
      if (local && serverDoc) {
        const localVersion = local.currentVersion || 0
        const serverVersion = serverDoc.currentVersion || 0
        const useServer = serverVersion > localVersion ||
          (serverVersion === localVersion &&
            new Date(serverDoc.updatedAt) > new Date(local.updatedAt))
        setDocument(useServer ? serverDoc : local)
      } else if (serverDoc) {
        setDocument(serverDoc)
      } else if (local) {
        setDocument(local)
      }
      setLoading(false)
    }
    load()
  }, [id, loadFromServer])

  const createDocument = useCallback(async (title: string) => {
    const now = new Date().toISOString()
    const doc: StoredDocument = {
      id: uuidv4(),
      title,
      ownerId: "",
      currentVersion: 1,
      content: DEFAULT_CONTENT,
      archived: false,
      createdAt: now,
      updatedAt: now,
    }
    await documentRepository.create(doc)
    setDocuments((prev) => [doc, ...prev])
    return doc
  }, [])

  const updateDocument = useCallback(async (docId: string, changes: Partial<StoredDocument>) => {
    const updated = await documentRepository.update(docId, changes)
    if (updated) {
      setDocument(updated)
      setDocuments((prev) => prev.map((d) => (d.id === docId ? updated : d)))
    }
  }, [])

  const deleteDocument = useCallback(async (docId: string) => {
    await documentRepository.delete(docId)
    setDocuments((prev) => prev.filter((d) => d.id !== docId))
    if (document?.id === docId) setDocument(null)
  }, [document?.id])

  const saveContent = useCallback(async (docId: string, content: Record<string, unknown>) => {
    await documentRepository.update(docId, {
      content,
      updatedAt: new Date().toISOString(),
    })
  }, [])

  const applyRemoteOps = useCallback(async (docId: string, ops: Array<{ payload: Record<string, unknown> }>) => {
    for (const op of ops) {
      if (op.payload && op.payload.content && typeof op.payload.content === 'object') {
        await documentRepository.update(docId, {
          content: op.payload.content as Record<string, unknown>,
          updatedAt: new Date().toISOString(),
        })
        const updated = await documentRepository.findById(docId)
        if (updated) setDocument(updated)
      }
    }
  }, [])

  const addOperation = useCallback(async (
    docId: string,
    clientId: string,
    type: StoredOperation["type"],
    payload: Record<string, unknown>,
    lamport: number
  ) => {
    const timestamp = new Date().toISOString()
    const checksum = `${docId}:${lamport}:${type}:${JSON.stringify(payload)}`
    const op: StoredOperation = {
      id: uuidv4(),
      documentId: docId,
      clientId,
      authorId: "",
      lamport,
      timestamp,
      type,
      payload,
      checksum,
      status: "PENDING",
      retryCount: 0,
      createdAt: timestamp,
    }
    await operationRepository.create(op)
    await queueRepository.add({
      operationId: op.id,
      documentId: docId,
      operation: op,
      retryCount: 0,
      createdAt: timestamp,
    })
    return op
  }, [])

  return {
    document,
    documents,
    loading,
    createDocument,
    updateDocument,
    deleteDocument,
    saveContent,
    addOperation,
  }
}