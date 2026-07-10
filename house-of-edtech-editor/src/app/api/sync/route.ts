import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const raw = await request.json()
    const stringified = JSON.stringify(raw)
    if (stringified.length > 100 * 1024) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 })
    }

    if (!raw.documentId || raw.version == null || typeof raw.version !== "number") {
      console.error("Invalid sync payload:", JSON.stringify(raw, null, 2))
      return NextResponse.json({ error: "Invalid payload: documentId and version are required" }, { status: 400 })
    }

    const { documentId, content, title, version, operations, snapshot } = raw as {
      documentId: string
      content?: string
      title?: string
      version: number
      operations?: Array<{
        documentId: string
        type: string
        data: unknown
        version: number
        lamport: number
        clientId: string
      }>
      snapshot?: {
        id: string
        version: number
        title: string
        content: string
        createdBy: string
      }
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        members: { where: { userId: session.user.id } },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const isOwner = document.ownerId === session.user.id
    const isEditor = document.members.some(
      (m) => m.userId === session.user.id && (m.role === "EDITOR" || m.role === "OWNER"),
    )

    if (!isOwner && !isEditor) {
      return NextResponse.json({ error: "Viewers cannot push updates" }, { status: 403 })
    }

    if (operations && operations.length > 0) {
      for (const op of operations) {
        await prisma.operation.create({
          data: {
            document: { connect: { id: documentId } },
            version: op.version,
            type: op.type as any,
            data: op.data as any,
            user: { connect: { id: session.user.id } },
          } as any,
        })
      }
    }

    if (snapshot) {
      await prisma.documentSnapshot.create({
        data: {
          document: { connect: { id: documentId } },
          version: snapshot.version,
          content: snapshot.content,
          user: { connect: { id: snapshot.createdBy } },
        } as any,
      })
    }

    if (content !== undefined || title !== undefined) {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          ...(content !== undefined && { content }),
          ...(title !== undefined && { title }),
          version,
        },
      })
    }

    // Return current server state
    const updated = await prisma.document.findUnique({
      where: { id: documentId },
      select: { content: true, title: true, version: true },
    })

    const serverOps = await prisma.operation.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json({
      document: updated,
      operations: serverOps.reverse().map((op) => ({
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
    console.error("Sync API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}