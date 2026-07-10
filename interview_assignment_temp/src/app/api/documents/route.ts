import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createDocumentSchema } from "@/validation/schemas"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    )
  }

  const documents = await db.document.findMany({
    where: {
      archived: false,
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const result = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    ownerId: doc.ownerId,
    ownerName: doc.owner.name,
    currentVersion: doc.currentVersion,
    archived: doc.archived,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    role: doc.members[0]?.role || "VIEWER",
  }))

  return NextResponse.json({ success: true, data: result })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    )
  }

  const body = await request.json()
  const parsed = createDocumentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_FAILED", message: parsed.error.issues[0].message } },
      { status: 422 }
    )
  }

  const doc = await db.document.create({
    data: {
      title: parsed.data.title,
      ownerId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
      snapshots: {
        create: {
          version: 1,
          snapshot: { type: "doc", content: [{ type: "paragraph", content: [] }] },
          createdBy: session.user.id,
          reason: "MANUAL",
        },
      },
    },
  })

  return NextResponse.json(
    { success: true, data: { documentId: doc.id } },
    { status: 201 }
  )
}
