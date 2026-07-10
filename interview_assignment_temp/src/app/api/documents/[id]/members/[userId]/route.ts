import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateMemberSchema } from "@/validation/schemas"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    )
  }

  const doc = await db.document.findUnique({ where: { id } })
  if (!doc || doc.ownerId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Only owner can change roles" } },
      { status: 403 }
    )
  }

  const body = await request.json()
  const parsed = updateMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_FAILED", message: parsed.error.issues[0].message } },
      { status: 422 }
    )
  }

  const member = await db.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId } },
  })
  if (!member) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Member not found" } },
      { status: 404 }
    )
  }

  if (member.role === "OWNER" && parsed.data.role !== "OWNER") {
    const ownerCount = await db.documentMember.count({
      where: { documentId: id, role: "OWNER" },
    })
    if (ownerCount <= 1) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Cannot remove last owner" } },
        { status: 400 }
      )
    }
  }

  const updated = await db.documentMember.update({
    where: { documentId_userId: { documentId: id, userId } },
    data: { role: parsed.data.role },
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    )
  }

  const doc = await db.document.findUnique({ where: { id } })
  if (!doc || doc.ownerId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Only owner can remove members" } },
      { status: 403 }
    )
  }

  const member = await db.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId } },
  })
  if (!member) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Member not found" } },
      { status: 404 }
    )
  }

  if (member.role === "OWNER") {
    const ownerCount = await db.documentMember.count({
      where: { documentId: id, role: "OWNER" },
    })
    if (ownerCount <= 1) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Cannot remove last owner" } },
        { status: 400 }
      )
    }
  }

  await db.documentMember.delete({
    where: { documentId_userId: { documentId: id, userId } },
  })

  return NextResponse.json({ success: true, data: null })
}
