import { NextResponse } from "next/server"
import { auth, requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  const { id, version } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    )
  }

  const canRestore = await requireRole(id, session.user.id, ["OWNER", "EDITOR"])
  if (!canRestore) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Not allowed to restore" } },
      { status: 403 }
    )
  }

  const snapshot = await db.documentSnapshot.findFirst({
    where: { documentId: id, version: parseInt(version) },
  })

  if (!snapshot) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Version not found" } },
      { status: 404 }
    )
  }

  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
      { status: 404 }
    )
  }

  const newVersion = doc.currentVersion + 1

  await db.documentSnapshot.create({
    data: {
      documentId: id,
      version: newVersion,
      snapshot: snapshot.snapshot as Prisma.InputJsonValue,
      createdBy: session.user.id,
      reason: "RESTORE",
    },
  })

  await db.document.update({
    where: { id },
    data: { currentVersion: newVersion },
  })

  return NextResponse.json({ success: true, data: { version: newVersion } })
}
