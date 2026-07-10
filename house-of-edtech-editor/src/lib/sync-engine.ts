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
  cleanupCorruptedData,
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

  private activeDocumentIds: Set<string> = new Set()

  start(): void {
    if (this.isRunning || !this.isOnline) return
    this.isRunning = true
    cleanupCorruptedData()
    this.fetchDocuments()
    this.syncInterval = setInterval(() => {
      this.fetchDocuments()
      this.pullActiveDocuments()
      this.processQueue()
    }, 5000)
    this.processQueue()
  }

  stop(): void {
    this.isRunning = false
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  trackDocument(documentId: string): void {
    this.activeDocumentIds.add(documentId)
  }

  untrackDocument(documentId: string): void {
    this.activeDocumentIds.delete(documentId)
  }

  private async pullActiveDocuments(): Promise<void> {
    const ids = Array.from(this.activeDocumentIds)
    for (const id of ids) {
      await this.pullDocument(id)
    }
  }

  async createDocument(title: string, ownerId: string): Promise<LocalDocument> {
    const id = uuidv4()
    const doc: LocalDocument = {
      id,
      title,
      content: "",
      version: 1,
      ownerId,
      updatedAt: Date.now(),
      syncedAt: null,
      isDirty: true,
    }
    await saveLocalDocument(doc)

    if (this.isOnline) {
      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, title, content: "" }),
        })
        if (res.ok) {
          const serverDoc = await res.json()
          await saveLocalDocument({
            ...doc,
            version: serverDoc.version,
            syncedAt: Date.now(),
            isDirty: false,
          })
          return doc
        }
      } catch {
      }
    }

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

    const nextVersion = (doc.version ?? 0) + 1
    const lamport = getLamportTimestamp()
    const op: LocalOperation = {
      id: uuidv4(),
      documentId,
      type: "UPDATE",
      data: { text: content, title },
      version: nextVersion,
      lamport,
      clientId: doc.ownerId,
      createdAt: Date.now(),
      synced: false,
    }

    await saveLocalOperation(op)
    await saveLocalDocument({ ...doc, content, title, version: nextVersion, updatedAt: Date.now(), isDirty: true })

    await enqueueSync({
      documentId,
      action: "UPDATE_DOCUMENT",
      payload: { content, title, version: nextVersion, lamport },
    })
  }

  async insertText(documentId: string, position: number, text: string): Promise<void> {
    const doc = await getLocalDocument(documentId)
    if (!doc) return

    const nextVersion = (doc.version ?? 0) + 1
    const lamport = getLamportTimestamp()
    const op: LocalOperation = {
      id: uuidv4(),
      documentId,
      type: "INSERT",
      data: { position, text },
      version: nextVersion,
      lamport,
      clientId: doc.ownerId,
      createdAt: Date.now(),
      synced: false,
    }

    await saveLocalOperation(op)
    const newContent = doc.content.slice(0, position) + text + doc.content.slice(position)
    await saveLocalDocument({ ...doc, content: newContent, version: nextVersion, updatedAt: Date.now(), isDirty: true })

    await enqueueSync({
      documentId,
      action: "CREATE_OPERATION",
      payload: op,
    })
  }

  async deleteText(documentId: string, position: number, length: number): Promise<void> {
    const doc = await getLocalDocument(documentId)
    if (!doc) return

    const nextVersion = (doc.version ?? 0) + 1
    const deletedText = doc.content.slice(position, position + length)
    const lamport = getLamportTimestamp()
    const op: LocalOperation = {
      id: uuidv4(),
      documentId,
      type: "DELETE",
      data: { position, text: deletedText },
      version: nextVersion,
      lamport,
      clientId: doc.ownerId,
      createdAt: Date.now(),
      synced: false,
    }

    await saveLocalOperation(op)
    const newContent = doc.content.slice(0, position) + doc.content.slice(position + length)
    await saveLocalDocument({ ...doc, content: newContent, version: nextVersion, updatedAt: Date.now(), isDirty: true })

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

    if (this.isOnline) {
      try {
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            version: doc.version,
            content: doc.content,
            title: doc.title,
            snapshot: {
              id: snapshot.id,
              version: snapshot.version,
              title: snapshot.title,
              content: snapshot.content,
              createdBy: snapshot.createdBy,
            },
          }),
        })
      } catch {
        await enqueueSync({
          documentId,
          action: "CREATE_SNAPSHOT",
          payload: snapshot,
        })
      }
    } else {
      await enqueueSync({
        documentId,
        action: "CREATE_SNAPSHOT",
        payload: snapshot,
      })
    }
  }

  async pullDocument(documentId: string): Promise<void> {
    try {
      const res = await fetch(`/api/documents/${documentId}`)
      if (!res.ok) return

      const serverDoc = await res.json()
      const local = await getLocalDocument(documentId)

      if (!local) {
        await saveLocalDocument({
          id: documentId,
          title: serverDoc.title ?? "Untitled",
          content: serverDoc.content ?? "",
          version: serverDoc.version ?? 1,
          ownerId: serverDoc.ownerId ?? "",
          updatedAt: Date.now(),
          syncedAt: Date.now(),
          isDirty: false,
        })
        return
      }

      if (serverDoc.version <= local.version) return

      await saveLocalDocument({
        ...local,
        content: local.isDirty ? local.content : serverDoc.content ?? local.content,
        title: local.isDirty ? local.title : serverDoc.title ?? local.title,
        version: serverDoc.version,
        updatedAt: Date.now(),
        syncedAt: Date.now(),
        isDirty: local.isDirty,
      })
    } catch {
    }
  }

  async pushChanges(documentId: string): Promise<boolean> {
    try {
      const doc = await getLocalDocument(documentId)
      if (!doc) return false

      const unsyncedOps = await getUnsyncedOperations(documentId)

      const safeVersion = typeof doc.version === "number" && !Number.isNaN(doc.version) ? doc.version : 1

      const payload: Record<string, unknown> = {
        documentId,
        version: safeVersion,
      }

      if (doc.isDirty) {
        payload.content = doc.content
        payload.title = doc.title
      }

      if (unsyncedOps.length > 0) {
        payload.operations = unsyncedOps.map((op) => ({
          documentId: op.documentId,
          type: op.type,
          data: op.data,
          version: typeof op.version === "number" && !Number.isNaN(op.version) ? op.version : safeVersion,
          lamport: typeof op.lamport === "number" && !Number.isNaN(op.lamport) ? op.lamport : safeVersion,
          clientId: op.clientId,
        }))
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

      const result = await response.json()

      if (result.document) {
        await saveLocalDocument({
          ...doc,
          content: result.document.content,
          title: result.document.title,
          version: result.document.version,
          isDirty: false,
          syncedAt: Date.now(),
        })
      } else {
        await markDocumentSynced(documentId)
      }

      for (const op of unsyncedOps) {
        await markOperationSynced(op.id)
      }

      return true
    } catch {
      return false
    }
  }

  async fetchDocuments(): Promise<void> {
    try {
      const res = await fetch("/api/documents")
      if (!res.ok) return
      const docs: Array<{ id: string; title: string; content: string; version: number; ownerId: string; updatedAt: string }> = await res.json()
      const serverIds = new Set(docs.map((d) => d.id))
      const localDocs = await localDb.documents.toArray()
      for (const local of localDocs) {
        if (!serverIds.has(local.id)) {
          await localDb.documents.delete(local.id)
        }
      }
      for (const doc of docs) {
        const existing = await getLocalDocument(doc.id)
        if (!existing || existing.version < doc.version) {
          await saveLocalDocument({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            version: doc.version,
            ownerId: doc.ownerId,
            updatedAt: new Date(doc.updatedAt).getTime(),
            syncedAt: Date.now(),
            isDirty: false,
          })
        }
      }
    } catch {
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

      if (item.action === "CREATE_DOCUMENT") {
        const doc = item.payload as LocalDocument
        try {
          const res = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: doc.id, title: doc.title, content: doc.content }),
          })
          if (res.ok) {
            const serverDoc = await res.json()
            await saveLocalDocument({
              ...doc,
              version: serverDoc.version,
              syncedAt: Date.now(),
              isDirty: false,
            })
          } else {
            throw new Error("create failed")
          }
        } catch {
          if (item.retries < (item.maxRetries ?? 5)) {
            await localDb.syncQueue.add({ ...item, retries: item.retries + 1, createdAt: Date.now() })
            this.notify("error")
          } else {
            this.notify("error")
          }
          return
        }
      } else {
        const doc = await getLocalDocument(item.documentId)
        if (!doc) {
          this.notify("idle")
          return
        }

        const success = await this.pushChanges(item.documentId)
        if (!success) {
          if (item.retries < (item.maxRetries ?? 5)) {
            await localDb.syncQueue.add({ ...item, retries: item.retries + 1, createdAt: Date.now() })
            this.notify("error")
          } else {
            this.notify("error")
          }
          return
        }
      }

      await this.pullDocument(item.documentId)
      this.notify("idle")
    } catch {
      this.notify("error")
    }
  }
}

export const syncEngine = new SyncEngine()