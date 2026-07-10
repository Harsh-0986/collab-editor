import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { operationQuerySchema } from "@/validation/schemas"

export async function GET(
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

  const url = new URL(request.url)
  const query = operationQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  const after = query.success ? query.data.after : undefined

  const operations = await db.operation.findMany({
    where: {
      documentId: id,
      ...(after ? { lamport: { gt: after } } : {}),
    },
    orderBy: { lamport: "asc" },
    take: 100,
  })

  const result = operations.map((op) => ({
    id: op.id,
    lamport: op.lamport,
    timestamp: op.createdAt.toISOString(),
    type: op.operationType,
    payload: op.payload,
    checksum: op.checksum,
  }))

  return NextResponse.json({ success: true, data: result })
}
