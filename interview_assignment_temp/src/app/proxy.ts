import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function proxy(request: Request) {
  const { pathname } = new URL(request.url)

  // Skip middleware for API routes (let them handle auth themselves)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  const session = await auth()

  if (!session?.user) {
    const publicPaths = ["/login", "/register"]
    const isPublic = publicPaths.some((p) => pathname.startsWith(p))
    if (!isPublic && !pathname.startsWith("/_next") && !pathname.startsWith("/favicon")) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  if (session?.user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
