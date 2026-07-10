import { z } from "zod"

export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024
export const MAX_CONTENT_SIZE = 4 * 1024 * 1024
export const MAX_TITLE_SIZE = 500
export const MAX_OPERATIONS_PER_SYNC = 100
export const MAX_PAYLOAD_SIZE = 100 * 1024
export const MAX_SNAPSHOT_COUNT = 1000
export const MAX_RETRIES = 5

const sanitizeString = (val: string): string => {
  if (typeof val !== "string") return ""
  if (val.length > MAX_CONTENT_SIZE) return val.slice(0, MAX_CONTENT_SIZE)
  return val.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
}

export const documentSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(0).max(MAX_TITLE_SIZE).transform(sanitizeString),
  content: z.string().max(MAX_CONTENT_SIZE).transform(sanitizeString),
  version: z.number().int().min(0),
})

export const operationSchema = z.object({
  documentId: z.string().min(1).max(100),
  type: z.enum(["INSERT", "UPDATE", "DELETE"]),
  data: z.any(),
  version: z.number().int().min(0),
  lamport: z.number().int().min(0),
  clientId: z.string().min(1).max(100),
})

export const snapshotSchema = z.object({
  id: z.string().min(1).max(100),
  documentId: z.string().min(1).max(100),
  version: z.number().int().min(0),
  title: z.string().max(MAX_TITLE_SIZE).transform(sanitizeString),
  content: z.string().max(MAX_CONTENT_SIZE).transform(sanitizeString),
})

export const syncPayloadSchema = z.object({
  documentId: z.string().min(1).max(100),
  operations: z
    .array(operationSchema)
    .min(0)
    .max(MAX_OPERATIONS_PER_SYNC),
  baseVersion: z.number().int().min(0),
  lamport: z.number().int().min(0),
})

export function validateSyncPayload(payload: unknown) {
  const raw = JSON.stringify(payload)
  if (raw.length > MAX_PAYLOAD_SIZE) {
    throw new Error(`Payload exceeds maximum size of ${MAX_PAYLOAD_SIZE} bytes`)
  }
  return syncPayloadSchema.parse(payload)
}

export function validateDocument(data: unknown) {
  const raw = JSON.stringify(data)
  if (raw.length > MAX_DOCUMENT_SIZE) {
    throw new Error(`Document exceeds maximum size of ${MAX_DOCUMENT_SIZE} bytes`)
  }
  return documentSchema.parse(data)
}

export function validateSnapshot(data: unknown) {
  const raw = JSON.stringify(data)
  if (raw.length > MAX_CONTENT_SIZE) {
    throw new Error(`Snapshot exceeds maximum size of ${MAX_CONTENT_SIZE} bytes`)
  }
  return snapshotSchema.parse(data)
}