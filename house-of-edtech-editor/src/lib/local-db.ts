import Dexie, { type EntityTable } from "dexie"
import { v4 as uuidv4 } from "uuid"
import { MAX_RETRIES } from "./validation"

export interface LocalDocument {
  id: string
  title: string
  content: string
  version: number
  ownerId: string
  updatedAt: number
  syncedAt: number | null
  isDirty: boolean
}

export interface LocalOperation {
  id: string
  documentId: string
  type: "INSERT" | "UPDATE" | "DELETE"
  data: unknown
  version: number
  lamport: number
  clientId: string
  createdAt: number
  synced: boolean
}

export interface LocalSnapshot {
  id: string
  documentId: string
  version: number
  title: string
  content: string
  createdBy: string
  createdAt: number
  synced: boolean
}

export interface SyncQueueItem {
  id: string
  documentId: string
  action: "CREATE_DOCUMENT" | "UPDATE_DOCUMENT" | "CREATE_OPERATION" | "CREATE_SNAPSHOT"
  payload: unknown
  retries: number
  maxRetries?: number
  createdAt: number
}

class LocalDatabase extends Dexie {
  documents!: EntityTable<LocalDocument, "id">
  operations!: EntityTable<LocalOperation, "id">
  snapshots!: EntityTable<LocalSnapshot, "id">
  syncQueue!: EntityTable<SyncQueueItem, "id">

  constructor() {
    super("HouseOfEdtechEditor")
    this.version(1).stores({
      documents: "id, version, updatedAt, isDirty",
      operations: "id, documentId, version, synced",
      snapshots: "id, documentId, version, createdAt",
      syncQueue: "id, documentId, createdAt",
    })
  }
}

export const localDb = new LocalDatabase()

export async function getLocalDocument(id: string): Promise<LocalDocument | undefined> {
  return localDb.documents.get(id)
}

export async function saveLocalDocument(doc: LocalDocument): Promise<void> {
  await localDb.documents.put({ ...doc, isDirty: true, syncedAt: null })
}

export async function markDocumentSynced(id: string): Promise<void> {
  await localDb.documents.update(id, { isDirty: false, syncedAt: Date.now() })
}

export async function getLocalOperations(documentId: string, since?: number): Promise<LocalOperation[]> {
  let collection = localDb.operations
    .where("documentId")
    .equals(documentId)

  if (since !== undefined) {
    collection = collection.filter((op) => op.lamport > since)
  }

  return collection.sortBy("lamport")
}

export async function saveLocalOperation(op: LocalOperation): Promise<void> {
  await localDb.operations.put(op)
}

export async function markOperationSynced(id: string): Promise<void> {
  await localDb.operations.update(id, { synced: true })
}

export async function getUnsyncedOperations(documentId: string): Promise<LocalOperation[]> {
  return localDb.operations
    .where("documentId")
    .equals(documentId)
    .filter((op) => !op.synced)
    .sortBy("lamport")
}

export async function getLocalSnapshots(documentId: string): Promise<LocalSnapshot[]> {
  return localDb.snapshots
    .where("documentId")
    .equals(documentId)
    .sortBy("createdAt")
    .then((snaps) => snaps.reverse())
}

export async function saveLocalSnapshot(snapshot: LocalSnapshot): Promise<void> {
  await localDb.snapshots.put(snapshot)
}

export async function enqueueSync(item: Omit<SyncQueueItem, "id" | "retries" | "createdAt" | "maxRetries">): Promise<void> {
  await localDb.syncQueue.add({
    ...item,
    id: uuidv4(),
    retries: 0,
    maxRetries: MAX_RETRIES,
    createdAt: Date.now(),
  })
}

export async function dequeueSync(): Promise<SyncQueueItem | undefined> {
  const items = await localDb.syncQueue.orderBy("createdAt").first()
  if (items) {
    await localDb.syncQueue.delete(items.id)
  }
  return items
}

export async function getSyncQueueLength(): Promise<number> {
  return localDb.syncQueue.count()
}

export async function clearSyncedData(documentId: string): Promise<void> {
  await localDb.operations.where("documentId").equals(documentId).filter((op) => op.synced).delete()
  await localDb.snapshots.where("documentId").equals(documentId).filter((s) => s.synced).delete()
  await localDb.documents.where("id").equals(documentId).modify({ isDirty: false, syncedAt: Date.now() })
}