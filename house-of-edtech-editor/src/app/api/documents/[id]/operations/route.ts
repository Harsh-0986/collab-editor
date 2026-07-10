import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createOperationSchema = z.object({
  type: z.enum(["INSERT", "UPDATE", "DELETE"]),
  payload: z.any(),
  lamport: z.number().int().min(0)
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
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

    const operation = await prisma.operation.create({
      data: {
        documentId: id,
        createdBy: session.user.id,
        type: type as any,
        data: payload,
        version: lamport,
      }
    })

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const operations = await prisma.operation.findMany({
      where: { documentId: id },
      orderBy: { createdAt: "desc" },
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