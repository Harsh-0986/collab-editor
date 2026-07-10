import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const createOperationSchema = z.object({
  type: z.enum(["INSERT", "UPDATE", "DELETE"]),
  payload: z.any(),
  lamport: z.number().int().min(0)
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
          some: {
            userId: session.user.id,
            role: { in: ["OWNER", "EDITOR"] }
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const body = await request.json()
    const { type, payload, lamport } = createOperationSchema.parse(body)

    const operation = await db.documentOperation.create({
      data: {
        documentId: params.id,
        userId: session.user.id,
        type,
        payload,
        lamport,
        synced: false
      }
    })

    // Broadcast to other clients via WebSocket
    // This would be handled by a WebSocket server in production

    return NextResponse.json(operation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    console.error("Error creating operation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const operations = await db.documentOperation.findMany({
      where: { documentId: params.id },
      orderBy: { timestamp: "desc" },
      take: 50,
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(operations)
  } catch (error) {
    console.error("Error fetching operations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}