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
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        snapshots: {
          orderBy: { version: "desc" },
          take: 10,
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check if user has access to document
    const hasAccess = document.ownerId === session.user.id ||
      document.members.some(member => member.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error fetching document:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, content, version } = await request.json()

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

    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: {
        title,
        content,
        version: version || document.version + 1,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Create snapshot
    await prisma.documentSnapshot.create({
      data: {
        documentId: params.id,
        version: updatedDocument.version,
        content,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error("Error updating document:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get document to check ownership
    const document = await prisma.document.findUnique({
      where: { id: params.id },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Only owner can delete
    if (document.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    await prisma.document.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Document deleted" })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}