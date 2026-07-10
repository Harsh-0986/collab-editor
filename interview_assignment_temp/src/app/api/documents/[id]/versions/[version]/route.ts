import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
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

  const snapshot = await db.documentSnapshot.findFirst({
    where: { documentId: id, version: parseInt(version) },
    include: { document: { select: { members: { where: { userId: session.user.id }, select: { role: true } } } } },
  })

  if (!snapshot || !snapshot.document.members.length) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Version not found" } },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data: { snapshot: snapshot.snapshot } })
}
