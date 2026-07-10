import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: documentId, version: versionStr } = await params
    const restoreVersion = parseInt(versionStr, 10)

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

    const canEdit = document.ownerId === session.user.id ||
      document.members.some((m: { userId: string; role: string }) => m.userId === session.user.id && ["OWNER", "EDITOR"].includes(m.role))

    if (!canEdit) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const snapshot = await prisma.documentSnapshot.findUnique({
      where: {
        documentId_version: {
          documentId,
          version: restoreVersion,
        },
      },
    })

    if (!snapshot) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    const newVersion = document.version + 1

    const restored = await prisma.document.update({
      where: { id: documentId },
      data: {
        content: snapshot.content,
        version: newVersion,
      },
    })

    await prisma.documentSnapshot.create({
      data: {
        documentId,
        version: newVersion,
        content: snapshot.content,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({
      content: restored.content,
      version: restored.version,
      restoredFrom: restoreVersion,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}