import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ status: "ok", serverTime: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: "error", serverTime: new Date().toISOString() }, { status: 500 })
  }
}
