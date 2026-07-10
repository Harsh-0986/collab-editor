import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    const { id, version: versionStr } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
        members: {
          some: { userId: session.user.id }
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const snapshot = await prisma.documentSnapshot.findUnique({
      where: {
        documentId_version: {
          documentId: id,
          version: parseInt(versionStr),
        }
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })

    if (!snapshot) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error("Error fetching version:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}