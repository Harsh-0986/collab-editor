import Dexie, { type Table } from "dexie"
import type { StoredDocument, StoredOperation, StoredQueueItem, StoredSnapshot } from "@/types"

export class SyncPadDB extends Dexie {
  documents!: Table<StoredDocument, string>
  operations!: Table<StoredOperation, string>
  queue!: Table<StoredQueueItem, number>
  snapshots!: Table<StoredSnapshot, string>
  metadata!: Table<{ key: string; value: unknown }, string>

  constructor() {
    super("SyncPad")
    this.version(1).stores({
      documents: "id, ownerId, updatedAt",
      operations: "id, documentId, lamport, checksum, status",
      queue: "++id, operationId, documentId, retryCount",
      snapshots: "id, documentId, version",
      metadata: "key",
    })
  }
}

export const db = new SyncPadDB()

export const documentRepository = {
  async create(doc: StoredDocument) {
    await db.documents.put(doc)
    return doc
  },

  async findById(id: string) {
    return db.documents.get(id)
  },

  async findAll() {
    return db.documents.filter((d) => !d.archived).reverse().sortBy("updatedAt")
  },

  async update(id: string, changes: Partial<StoredDocument>) {
    await db.documents.update(id, changes)
    return db.documents.get(id)
  },

  async delete(id: string) {
    await db.documents.update(id, { archived: true })
  },
}

export const operationRepository = {
  async create(op: StoredOperation) {
    await db.operations.put(op)
    return op
  },

  async findByDocument(documentId: string) {
    return db.operations
      .where("documentId")
      .equals(documentId)
      .sortBy("lamport")
  },

  async findByLamportAfter(documentId: string, lamport: number) {
    return db.operations
      .where("documentId")
      .equals(documentId)
      .filter((op) => op.lamport > lamport)
      .sortBy("lamport")
  },

  async update(id: string, changes: Partial<StoredOperation>) {
    await db.operations.update(id, changes)
    return db.operations.get(id)
  },

  async getMaxLamport(documentId: string) {
    const ops = await db.operations
      .where("documentId")
      .equals(documentId)
      .sortBy("lamport")
    return ops.length > 0 ? ops[ops.length - 1].lamport : 0
  },
}

export const queueRepository = {
  async add(item: StoredQueueItem) {
    return db.queue.add(item)
  },

  async getAll() {
    return db.queue.toArray()
  },

  async getAllByDocument(documentId: string) {
    return db.queue.where("documentId").equals(documentId).toArray()
  },

  async remove(id: number) {
    await db.queue.delete(id)
  },

  async clear(documentId?: string) {
    if (documentId) {
      const items = await db.queue.where("documentId").equals(documentId).toArray()
      await db.queue.bulkDelete(items.map((i) => i.id!))
    } else {
      await db.queue.clear()
    }
  },

  async update(id: number, changes: Partial<StoredQueueItem>) {
    await db.queue.update(id, changes)
  },

  async count(documentId?: string) {
    if (documentId) {
      return db.queue.where("documentId").equals(documentId).count()
    }
    return db.queue.count()
  },
}

export const snapshotRepository = {
  async create(snap: StoredSnapshot) {
    await db.snapshots.put(snap)
    return snap
  },

  async findByDocument(documentId: string) {
    return db.snapshots
      .where("documentId")
      .equals(documentId)
      .reverse()
      .sortBy("version")
  },

  async findVersion(documentId: string, version: number) {
    return db.snapshots
      .where("documentId")
      .equals(documentId)
      .filter((s) => s.version === version)
      .first()
  },

  async getLatestVersion(documentId: string) {
    const snaps = await db.snapshots
      .where("documentId")
      .equals(documentId)
      .reverse()
      .sortBy("version")
    return snaps.length > 0 ? snaps[0].version : 0
  },
}

export const metadataRepository = {
  async get(key: string) {
    const entry = await db.metadata.get(key)
    return entry?.value
  },

  async set(key: string, value: unknown) {
    await db.metadata.put({ key, value })
  },
}
