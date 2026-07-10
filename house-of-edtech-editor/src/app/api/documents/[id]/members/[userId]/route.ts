import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "EDITOR", "VIEWER"]).default("VIEWER")
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const document = await db.document.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const body = await request.json()
    const { email, role } = addMemberSchema.parse(body)

    const user = await db.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user is already a member
    const existingMember = await db.documentMember.findUnique({
      where: {
        userId_documentId: {
          userId: user.id,
          documentId: params.id
        }
      }
    })

    if (existingMember) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 })
    }

    const member = await db.documentMember.create({
      data: {
        userId: user.id,
        documentId: params.id,
        role
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(member)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    console.error("Error adding member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const document = await db.document.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    await db.documentMember.delete({
      where: {
        userId_documentId: {
          userId: params.userId,
          documentId: params.id
        }
      }
    })

    return NextResponse.json({ message: "Member removed successfully" })
  } catch (error) {
    console.error("Error removing member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}