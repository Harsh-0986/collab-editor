export type Role = "OWNER" | "EDITOR" | "VIEWER"

export type SyncStatus = "ONLINE" | "OFFLINE" | "SYNCING" | "DISCONNECTED"

export type SnapshotReason = "MANUAL" | "AUTO" | "RESTORE"

export type OperationType = "INSERT" | "DELETE" | "FORMAT" | "MOVE" | "REPLACE"

export type ConnectionState = "online" | "offline" | "syncing" | "error"

export interface CursorPosition {
  x: number
  y: number
}

export interface StoredDocument {
  id: string
  title: string
  ownerId: string
  ownerName?: string
  currentVersion: number
  content?: Record<string, unknown>
  archived: boolean
  createdAt: string
  updatedAt: string
  role?: Role
}

export interface StoredOperation {
  id: string
  documentId: string
  clientId: string
  authorId: string
  lamport: number
  timestamp: string
  type: OperationType
  payload: Record<string, unknown>
  checksum: string
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED"
  retryCount: number
  nextRetry?: string
  createdAt: string
}

export interface StoredQueueItem {
  id?: number
  operationId: string
  documentId: string
  operation: StoredOperation
  retryCount: number
  nextRetry?: string
  createdAt: string
}

export interface StoredSnapshot {
  id: string
  documentId: string
  version: number
  snapshot: Record<string, unknown>
  createdBy: string
  reason: SnapshotReason
  createdAt: string
}

export interface SyncPayload {
  documentId: string
  clientId: string
  baseVersion: number
  operations: Array<{
    id: string
    lamport: number
    timestamp: string
    type: string
    payload: Record<string, unknown>
    checksum: string
  }>
}

export interface SyncResponse {
  acknowledged: string[]
  serverVersion: number
  operations: Array<{
    id: string
    lamport: number
    timestamp: string
    type: string
    payload: Record<string, unknown>
    checksum: string
  }>
  serverTime: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface VersionInfo {
  version: number
  createdAt: string
  createdBy: string
  reason: SnapshotReason
}

export interface DocumentMember {
  id: string
  userId: string
  email: string
  name: string
  role: Role
}

export interface AIRequest {
  action: "SUMMARIZE" | "REWRITE" | "TITLE" | "EXPLAIN" | "CONTINUE"
  document: string
  selection?: string
}

export interface AIResponse {
  result: string
}

export interface DevDiagnostics {
  connection: ConnectionState
  queueLength: number
  pendingOperations: number
  currentLamport: number
  localVersion: number
  serverVersion: number
  lastSyncDuration: number | null
  retryCount: number
  clientId: string
  lastSync: string | null
  lastHeartbeat: string | null
}
