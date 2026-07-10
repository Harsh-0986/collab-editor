import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    )
  }

  const doc = await db.document.findFirst({
    where: {
      id,
      members: { some: { userId: session.user.id } },
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  })

  if (!doc) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
      { status: 404 }
    )
  }

  const latestSnapshot = await db.documentSnapshot.findFirst({
    where: { documentId: id },
    orderBy: { version: "desc" },
  })

  return NextResponse.json({
    success: true,
    data: {
      id: doc.id,
      title: doc.title,
      ownerId: doc.ownerId,
      ownerName: doc.owner.name,
      currentVersion: doc.currentVersion,
      snapshot: latestSnapshot?.snapshot || null,
      archived: doc.archived,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      role: doc.members[0]?.role || "VIEWER",
    },
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    )
  }

  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
      { status: 404 }
    )
  }

  if (doc.ownerId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Only owner can delete" } },
      { status: 403 }
    )
  }

  await db.document.update({
    where: { id },
    data: { archived: true },
  })

  return NextResponse.json({ success: true, data: null })
}
