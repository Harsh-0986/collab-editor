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

    const { documentId, email } = await request.json()
    if (!documentId || !email) {
      return NextResponse.json({ error: "documentId and email are required" }, { status: 400 })
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

    const canInvite = document.ownerId === session.user.id ||
      document.members.some((m) => m.role === "OWNER")

    if (!canInvite) {
      return NextResponse.json({ error: "Only the owner can invite collaborators" }, { status: 403 })
    }

    const targetUser = await prisma.user.findUnique({ where: { email } })
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (targetUser.id === session.user.id) {
      return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 })
    }

    const existing = await prisma.documentMember.findUnique({
      where: { documentId_userId: { documentId, userId: targetUser.id } },
    })
    if (existing) {
      return NextResponse.json({ error: "User is already a collaborator" }, { status: 409 })
    }

    await prisma.documentMember.create({
      data: {
        documentId,
        userId: targetUser.id,
        role: "EDITOR",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Invite error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
