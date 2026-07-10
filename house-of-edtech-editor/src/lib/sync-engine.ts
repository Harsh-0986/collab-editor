import { v4 as uuidv4 } from "uuid"
import {
  localDb,
  getLocalDocument,
  saveLocalDocument,
  markDocumentSynced,
  getLocalOperations,
  saveLocalOperation,
  markOperationSynced,
  getUnsyncedOperations,
  saveLocalSnapshot,
  enqueueSync,
  dequeueSync,
  type LocalDocument,
  type LocalOperation,
  type LocalSnapshot,
} from "./local-db"
import {
  resolveConflicts,
  transformOperation,
  getLamportTimestamp,
  updateLamportClock,
  type ResolvedOperation,
} from "./conflict-resolver"

export type SyncStatus = "idle" | "syncing" | "offline" | "error" | "conflict"

export type SyncListener = (status: SyncStatus) => void

class SyncEngine {
  private isRunning = false
  private isOnline = true
  private listeners: Set<SyncListener> = new Set()
  private syncInterval: ReturnType<typeof setInterval> | null = null

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(status: SyncStatus): void {
    this.listeners.forEach((fn) => fn(status))
  }

  setOnline(online: boolean): void {
    this.isOnline = online
    this.notify(online ? "idle" : "offline")
    if (online && !this.isRunning) {
      this.start()
    }
  }

  start(): void {
    if (this.isRunning || !this.isOnline) return
    this.isRunning = true
    this.syncInterval = setInterval(() => this.processQueue(), 5000)
    this.processQueue()
  }

  stop(): void {
    this.isRunning = false
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  async createDocument(title: string, ownerId: string): Promise<LocalDocument> {
    const doc: LocalDocument = {
      id: uuidv4(),
      title,
      content: "",
      version: 1,
      ownerId,
      updatedAt: Date.now(),
      syncedAt: null,
      isDirty: true,
    }
    await saveLocalDocument(doc)
    await enqueueSync({
      documentId: doc.id,
      action: "CREATE_DOCUMENT",
      payload: doc,
    })
    return doc
  }

  async updateDocumentContent(
    documentId: string,
    content: string,
    title: string,
  ): Promise<void> {
    const doc = await getLocalDocument(documentId)
    if (!doc) return

    const lamport = getLamportTimestamp()
    const op: LocalOperation = {
      id: uuidv4(),
      documentId,
      type: "UPDATE",
      data: { text: content, title },
      version: doc.version + 1,
      lamport,
      clientId: doc.ownerId,
      createdAt: Date.now(),
      synced: false,
    }

    await saveLocalOperation(op)
    await saveLocalDocument({ ...doc, content, title, version: doc.version + 1, updatedAt: Date.now(), isDirty: true })

    await enqueueSync({
      documentId,
      action: "UPDATE_DOCUMENT",
      payload: { content, title, version: doc.version + 1, lamport },
    })
  }

  async insertText(documentId: string, position: number, text: string): Promise<void> {
    const doc = await getLocalDocument(documentId)
    if (!doc) return

    const lamport = getLamportTimestamp()
    const op: LocalOperation = {
      id: uuidv4(),
      documentId,
      type: "INSERT",
      data: { position, text },
      version: doc.version + 1,
      lamport,
      clientId: doc.ownerId,
      createdAt: Date.now(),
      synced: false,
    }

    await saveLocalOperation(op)
    const newContent = doc.content.slice(0, position) + text + doc.content.slice(position)
    await saveLocalDocument({ ...doc, content: newContent, version: doc.version + 1, updatedAt: Date.now(), isDirty: true })

    await enqueueSync({
      documentId,
      action: "CREATE_OPERATION",
      payload: op,
    })
  }

  async deleteText(documentId: string, position: number, length: number): Promise<void> {
    const doc = await getLocalDocument(documentId)
    if (!doc) return

    const deletedText = doc.content.slice(position, position + length)
    const lamport = getLamportTimestamp()
    const op: LocalOperation = {
      id: uuidv4(),
      documentId,
      type: "DELETE",
      data: { position, text: deletedText },
      version: doc.version + 1,
      lamport,
      clientId: doc.ownerId,
      createdAt: Date.now(),
      synced: false,
    }

    await saveLocalOperation(op)
    const newContent = doc.content.slice(0, position) + doc.content.slice(position + length)
    await saveLocalDocument({ ...doc, content: newContent, version: doc.version + 1, updatedAt: Date.now(), isDirty: true })

    await enqueueSync({
      documentId,
      action: "CREATE_OPERATION",
      payload: op,
    })
  }

  async createSnapshot(documentId: string, title: string, content: string, createdBy: string): Promise<void> {
    const doc = await getLocalDocument(documentId)
    if (!doc) return

    const snapshot: LocalSnapshot = {
      id: uuidv4(),
      documentId,
      version: doc.version,
      title,
      content,
      createdBy,
      createdAt: Date.now(),
      synced: false,
    }

    await saveLocalSnapshot(snapshot)
    await enqueueSync({
      documentId,
      action: "CREATE_SNAPSHOT",
      payload: snapshot,
    })
  }

  async pullChanges(documentId: string): Promise<LocalOperation[]> {
    try {
      const response = await fetch(`/api/operations?documentId=${encodeURIComponent(documentId)}`)
      if (!response.ok) return []

      const remoteOps: Array<{ id: string; type: string; data: unknown; version: number; lamport: number; createdBy: string; createdAt: string }> = await response.json()
      if (!Array.isArray(remoteOps)) return []

      const localOps = await getUnsyncedOperations(documentId)
      const baseVersion = (await getLocalDocument(documentId))?.version ?? 0

      const mappedLocal: LocalOperation[] = localOps.map((op) => ({
        ...op,
        lamport: op.lamport,
      }))

      const mappedRemote: LocalOperation[] = remoteOps.map((op) => ({
        id: op.id,
        documentId,
        type: op.type as "INSERT" | "UPDATE" | "DELETE",
        data: op.data,
        version: op.version,
        lamport: op.lamport,
        clientId: op.createdBy,
        createdAt: new Date(op.createdAt).getTime(),
        synced: true,
      }))

      const resolved: ResolvedOperation = resolveConflicts(mappedLocal, mappedRemote, baseVersion)

      for (const op of resolved.ops) {
        updateLamportClock(op.lamport)
      }

      const doc = await getLocalDocument(documentId)
      if (doc) {
        let mergedContent = doc.content
        for (const op of resolved.ops) {
          if (!localOps.find((lo) => lo.id === op.id)) {
            mergedContent = transformOperation(mergedContent, op)
          }
        }
        await saveLocalDocument({
          ...doc,
          content: mergedContent,
          version: resolved.baseVersion,
          updatedAt: Date.now(),
          isDirty: localOps.length > 0,
        })
      }

      for (const op of resolved.ops) {
        await saveLocalOperation({ ...op, synced: true })
      }

      return resolved.ops
    } catch {
      return []
    }
  }

  async pushChanges(documentId: string): Promise<boolean> {
    try {
      const unsyncedOps = await getUnsyncedOperations(documentId)
      if (unsyncedOps.length === 0) return true

      const payload = {
        documentId,
        operations: unsyncedOps.map((op) => ({
          documentId: op.documentId,
          type: op.type,
          data: op.data,
          version: op.version,
          lamport: op.lamport,
          clientId: op.clientId,
        })),
        baseVersion: unsyncedOps[0].version,
        lamport: Math.max(...unsyncedOps.map((o) => o.lamport)),
      }

      const stringified = JSON.stringify(payload)
      if (stringified.length > 100 * 1024) {
        return false
      }

      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: stringified,
      })

      if (!response.ok) return false

      for (const op of unsyncedOps) {
        await markOperationSynced(op.id)
      }

      await markDocumentSynced(documentId)
      return true
    } catch {
      return false
    }
  }

  private async processQueue(): Promise<void> {
    if (!this.isOnline) return

    this.notify("syncing")

    try {
      const item = await dequeueSync()
      if (!item) {
        this.notify("idle")
        return
      }

      const doc = await getLocalDocument(item.documentId)
      if (!doc) {
        this.notify("idle")
        return
      }

      const success = await this.pushChanges(item.documentId)
      if (success) {
        await this.pullChanges(item.documentId)
        this.notify("idle")
      } else {
        if (item.retries < (item.maxRetries ?? 5)) {
          await localDb.syncQueue.add({
            ...item,
            retries: item.retries + 1,
            createdAt: Date.now(),
          })
          this.notify("error")
        } else {
          this.notify("error")
        }
      }
    } catch {
      this.notify("error")
    }
  }
}

export const syncEngine = new SyncEngine()