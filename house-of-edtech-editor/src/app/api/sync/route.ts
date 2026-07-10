import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { validateSyncPayload } from "@/lib/validation"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    let payload: ReturnType<typeof validateSyncPayload>
    try {
      payload = validateSyncPayload(raw)
    } catch (err) {
      if (err instanceof Error) {
        return NextResponse.json({ error: err.message }, { status: 422 })
      }
      return NextResponse.json({ error: "Invalid payload" }, { status: 422 })
    }

    const { documentId, operations, lamport } = payload

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const isOwner = document.ownerId === session.user.id
    const isEditor = document.members.some(
      (m) => m.userId === session.user.id && m.role === "EDITOR",
    )
    const isViewer = document.members.some(
      (m) => m.userId === session.user.id && m.role === "VIEWER",
    )

    if (!isOwner && !isEditor && !isViewer) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (isViewer) {
      return NextResponse.json({ error: "Viewers cannot push updates" }, { status: 403 })
    }

    for (const op of operations) {
      await prisma.operation.create({
        data: {
          documentId,
          version: op.version,
          type: op.type as any,
          data: op.data as any,
          createdBy: session.user.id,
        },
      })
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { version: lamport },
    })

    const remoteOps = await prisma.operation.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({
      accepted: operations.length,
      lamport,
      remoteOps: remoteOps.reverse().map((op) => ({
        id: op.id,
        documentId: op.documentId,
        type: op.type,
        data: op.data,
        version: op.version,
        lamport: op.version,
        createdBy: op.createdBy,
        createdAt: op.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}