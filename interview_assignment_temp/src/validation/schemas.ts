import { z } from "zod"

export const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
})

export const updateMemberSchema = z.object({
  role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
})

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["EDITOR", "VIEWER"]).default("EDITOR"),
})

export const syncOperationSchema = z.object({
  id: z.string().uuid(),
  lamport: z.number().int().positive(),
  timestamp: z.string(),
  type: z.enum(["INSERT", "DELETE", "FORMAT", "MOVE", "REPLACE"]),
  payload: z.record(z.string(), z.unknown()),
  checksum: z.string().min(1),
})

export const syncRequestSchema = z.object({
  documentId: z.string().uuid(),
  clientId: z.string().min(1),
  baseVersion: z.number().int().positive(),
  operations: z.array(syncOperationSchema).max(100),
})

export const aiRequestSchema = z.object({
  action: z.enum(["SUMMARIZE", "REWRITE", "TITLE", "EXPLAIN", "CONTINUE"]),
  document: z.string().min(1).max(20000),
  selection: z.string().optional(),
})

export const documentQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
})

export const operationQuerySchema = z.object({
  after: z.coerce.number().int().positive().optional(),
})
