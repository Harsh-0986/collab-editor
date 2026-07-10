import type { LocalOperation } from "./local-db"

let lamportClock = 0

export function getLamportTimestamp(): number {
  lamportClock += 1
  return lamportClock
}

export function updateLamportClock(received: number): void {
  lamportClock = Math.max(lamportClock, received) + 1
}

export interface ResolvedOperation {
  ops: LocalOperation[]
  baseVersion: number
}

export function resolveConflicts(
  localOps: LocalOperation[],
  remoteOps: LocalOperation[],
  baseVersion: number,
): ResolvedOperation {
  const merged = new Map<string, LocalOperation>()

  for (const op of localOps) {
    const key = `${op.documentId}:${op.lamport}`
    merged.set(key, op)
  }

  for (const op of remoteOps) {
    const key = `${op.documentId}:${op.lamport}`
    const existing = merged.get(key)
    if (!existing || resolveTie(existing, op) === op) {
      merged.set(key, op)
    }
  }

  const ops = Array.from(merged.values()).sort((a, b) => {
    if (a.lamport !== b.lamport) return a.lamport - b.lamport
    return a.clientId < b.clientId ? -1 : 1
  })

  return {
    ops,
    baseVersion: ops.length > 0 ? ops[ops.length - 1].lamport : baseVersion,
  }
}

function resolveTie(a: LocalOperation, b: LocalOperation): LocalOperation {
  if (a.lamport !== b.lamport) {
    return a.lamport < b.lamport ? a : b
  }
  return a.clientId < b.clientId ? a : b
}

export function transformOperation(content: string, op: LocalOperation): string {
  if (!content) return content

  const data = op.data as { position?: number; text?: string } | undefined
  if (!data) return content

  switch (op.type) {
    case "INSERT": {
      if (data.position === undefined || data.text === undefined) return content
      const pos = Math.min(data.position, content.length)
      return content.slice(0, pos) + data.text + content.slice(pos)
    }
    case "DELETE": {
      if (data.position === undefined || data.text === undefined) return content
      const pos = Math.min(data.position, content.length)
      const len = Math.min(data.text.length, content.length - pos)
      return content.slice(0, pos) + content.slice(pos + len)
    }
    case "UPDATE": {
      return data.text ?? content
    }
    default:
      return content
  }
}