import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check if user has access to document
    const hasAccess = document.ownerId === session.user.id ||
      (await prisma.documentMember.findFirst({
        where: {
          documentId: params.id,
          userId: session.user.id,
        },
      }))

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const snapshots = await prisma.documentSnapshot.findMany({
      where: { documentId: params.id },
      orderBy: { version: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(snapshots)
  } catch (error) {
    console.error("Error fetching snapshots:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, version } = await request.json()

    // Get document to check permissions
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check if user has edit permissions
    const canEdit = document.ownerId === session.user.id ||
      document.members.some(member => 
        member.userId === session.user.id && 
        ["OWNER", "EDITOR"].includes(member.role)
      )

    if (!canEdit) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Create snapshot
    const snapshot = await prisma.documentSnapshot.create({
      data: {
        documentId: params.id,
        version: version || document.version + 1,
        content,
        createdBy: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(snapshot, { status: 201 })
  } catch (error) {
    console.error("Error creating snapshot:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}