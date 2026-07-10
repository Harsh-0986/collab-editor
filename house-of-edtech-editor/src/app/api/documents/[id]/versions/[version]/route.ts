import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const createSnapshotSchema = z.object({
  reason: z.string().min(1).max(100),
  content: z.any().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const document = await db.document.findFirst({
      where: {
        id: params.id,
        members: {
          some: { userId: session.user.id }
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const body = await request.json()
    const { reason, content } = createSnapshotSchema.parse(body)

    // Use provided content or current document content
    const snapshotContent = content || document.content

    const latestSnapshot = await db.documentSnapshot.findFirst({
      where: { documentId: params.id },
      orderBy: { version: "desc" }
    })

    const newVersion = parseInt(params.version) || (latestSnapshot?.version || 0) + 1

    const snapshot = await db.documentSnapshot.create({
      data: {
        documentId: params.id,
        version: newVersion,
        snapshot: snapshotContent,
        createdBy: session.user.id,
        reason
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(snapshot)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    console.error("Error creating snapshot:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const document = await db.document.findFirst({
      where: {
        id: params.id,
        members: {
          some: { userId: session.user.id }
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const snapshot = await db.documentSnapshot.findFirst({
      where: {
        documentId: params.id,
        version: parseInt(params.version)
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 })
    }

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error("Error fetching snapshot:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}