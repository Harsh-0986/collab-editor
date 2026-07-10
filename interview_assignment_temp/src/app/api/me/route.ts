import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
  })
}
