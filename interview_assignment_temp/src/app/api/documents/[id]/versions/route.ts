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

  const snapshots = await db.documentSnapshot.findMany({
    where: { documentId: id },
    include: { document: { select: { members: { where: { userId: session.user.id }, select: { role: true } } } } },
    orderBy: { version: "desc" },
  })

  if (snapshots.length === 0 || !snapshots[0].document.members.length) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
      { status: 404 }
    )
  }

  const result = snapshots.map((s) => ({
    version: s.version,
    createdAt: s.createdAt.toISOString(),
    createdBy: s.createdBy,
    reason: s.reason,
  }))

  return NextResponse.json({ success: true, data: result })
}
