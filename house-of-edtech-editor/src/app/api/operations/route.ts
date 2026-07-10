import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const documentId = request.nextUrl.searchParams.get("documentId")
    if (!documentId) {
      return NextResponse.json({ error: "documentId query param required" }, { status: 400 })
    }

    const document = await prisma.document.findUnique({ where: { id: documentId } })
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const hasAccess = document.ownerId === session.user.id ||
      (await prisma.documentMember.findFirst({
        where: { documentId, userId: session.user.id },
      }))

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const operations = await prisma.operation.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(operations)
  } catch (error) {
    console.error("Error fetching operations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId, type, data, version } = await request.json()
    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 })
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { members: { where: { userId: session.user.id } } },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const canEdit = document.ownerId === session.user.id ||
      document.members.some((m: { userId: string; role: string }) => m.userId === session.user.id && ["OWNER", "EDITOR"].includes(m.role))

    if (!canEdit) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const operation = await prisma.operation.create({
      data: {
        documentId,
        version: version || document.version + 1,
        type,
        data,
        createdBy: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(operation, { status: 201 })
  } catch (error) {
    console.error("Error creating operation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}