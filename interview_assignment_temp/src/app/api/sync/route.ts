import { NextResponse } from "next/server"
import { auth, getDocumentRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { syncRequestSchema } from "@/validation/schemas"

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie")
  console.log("[sync] cookies:", cookieHeader?.split("; ").map(c => c.split("=")[0]).join(", "))
  const session = await auth()
  console.log("[sync] session:", session?.user?.id ? "authenticated" : "NO SESSION")
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    )
  }

  const body = await request.json()
  const parsed = syncRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_FAILED", message: parsed.error.issues[0].message } },
      { status: 422 }
    )
  }

  const { documentId, clientId, baseVersion, operations } = parsed.data

  const role = await getDocumentRole(documentId, session.user.id)
  if (!role) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
      { status: 404 }
    )
  }

  if (role === "VIEWER") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Viewers cannot sync" } },
      { status: 403 }
    )
  }

  const payloadSize = JSON.stringify(body).length
  if (payloadSize > 500 * 1024) {
    return NextResponse.json(
      { success: false, error: { code: "PAYLOAD_TOO_LARGE", message: "Payload exceeds 500KB" } },
      { status: 413 }
    )
  }

  const acknowledged: string[] = []
  const newOps: Array<{
    id: string
    lamport: number
    timestamp: string
    type: string
    payload: Prisma.InputJsonValue
    checksum: string
  }> = []

  try {
    const result = await db.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({ where: { id: documentId } })
      if (!doc) throw new Error("DOCUMENT_NOT_FOUND")

      // Get the actual current version from the database
      const currentVersion = doc.currentVersion
      const newVersion = Math.max(currentVersion, baseVersion)

      if (newVersion > doc.currentVersion) {
        await tx.document.update({
          where: { id: documentId },
          data: { currentVersion: newVersion },
        })
      }

      const shouldSnapshot = acknowledged.length > 0 && operations.length > 0 && (
        (newVersion - baseVersion) >= 20
      )

       console.log("[sync] processing operations:", operations.length, "baseVersion:", baseVersion)
       for (const op of operations) {
         // Check both ID and checksum to handle retries
         const existingById = await tx.operation.findUnique({ where: { id: op.id } })
         if (existingById) {
           acknowledged.push(op.id)
           continue
         }

         const existing = await tx.operation.findUnique({
           where: { documentId_checksum: { documentId, checksum: op.checksum } },
         })

         if (existing) {
           acknowledged.push(op.id)
           continue
         }

        await tx.operation.create({
          data: {
            id: op.id,
            documentId,
            authorId: session.user.id,
            lamport: op.lamport,
            clientId: clientId,
            operationType: op.type,
            payload: op.payload as Prisma.InputJsonValue,
            checksum: op.checksum,
          },
        }).catch(async (error) => {
          // If it's a unique constraint violation, check if it already exists
          if (error.code === 'P2002') {
            const existing = await tx.operation.findUnique({
              where: { documentId_checksum: { documentId, checksum: op.checksum } },
            })
            if (existing) {
              acknowledged.push(op.id)
            }
          } else {
            throw error
          }
        })

        acknowledged.push(op.id)
       }

      if (shouldSnapshot) {
        const latestSnapshot = await tx.documentSnapshot.findFirst({
          where: { documentId },
          orderBy: { version: "desc" },
        })

        const nextVersion = (latestSnapshot?.version ?? doc.currentVersion) + 1

        await tx.documentSnapshot.create({
          data: {
            documentId,
            version: nextVersion,
            snapshot: (latestSnapshot?.snapshot || { type: "doc", content: [] }) as Prisma.InputJsonValue,
            createdBy: session.user.id,
            reason: "AUTO",
          },
        })
      }

      const remoteOps = await tx.operation.findMany({
        where: {
          documentId,
          lamport: { gt: baseVersion },
        },
        orderBy: { lamport: "asc" },
        take: 100,
      })

      console.log("[sync] remote ops found:", remoteOps.length)
      for (const op of remoteOps) {
        newOps.push({
          id: op.id,
          lamport: op.lamport,
          timestamp: op.createdAt.toISOString(),
          type: op.operationType,
          payload: op.payload as Prisma.InputJsonValue,
          checksum: op.checksum,
        })
      }

      // Clear acknowledged operations from the queue after successful sync
      if (acknowledged.length > 0) {
        console.log("[sync] clearing acknowledged operations:", acknowledged)
        // Note: In a real implementation, you'd need to access the queue repository here
        // Since we don't have a status field, we'll just log that they were processed
        console.log("[sync] processed", acknowledged.length, "operations successfully")
      } else {
        console.log("[sync] no operations to clear")
      }

      return { serverVersion: newVersion }
    })

    return NextResponse.json({
      success: true,
      data: {
        acknowledged,
        serverVersion: result.serverVersion,
        operations: newOps,
        serverTime: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[sync] error:", error)
    const message = error instanceof Error ? error.message : "Sync failed"
    if (message === "DOCUMENT_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document does not exist" } },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Synchronization failed" } },
      { status: 500 }
    )
  }
}
