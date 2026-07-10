import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { inviteMemberSchema } from "@/validation/schemas"

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

  const members = await db.documentMember.findMany({
    where: { documentId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  const result = members.map((m: { id: string; userId: string; role: string; user: { id: string; name: string | null; email: string } }) => ({
    id: m.id,
    userId: m.userId,
    email: m.user.email,
    name: m.user.name,
    role: m.role,
  }))

  return NextResponse.json({ success: true, data: result })
}

export async function POST(
  request: Request,
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
  if (!doc || doc.ownerId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Only owner can invite" } },
      { status: 403 }
    )
  }

  const body = await request.json()
  const parsed = inviteMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_FAILED", message: parsed.error.issues[0].message } },
      { status: 422 }
    )
  }

  const targetUser = await db.user.findUnique({ where: { email: parsed.data.email } })
  if (!targetUser) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
      { status: 404 }
    )
  }

  const existing = await db.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: targetUser.id } },
  })
  if (existing) {
    return NextResponse.json(
      { success: false, error: { code: "CONFLICT", message: "User is already a member" } },
      { status: 409 }
    )
  }

  const member = await db.documentMember.create({
    data: {
      documentId: id,
      userId: targetUser.id,
      role: parsed.data.role,
    },
  })

  return NextResponse.json({ success: true, data: member }, { status: 201 })
}
