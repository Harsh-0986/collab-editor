import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl

  // Allow access to auth pages and API routes
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to sign-in page
  if (!token && pathname !== "/signin" && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/signin", request.url))
  }

  if (token && pathname === "/signin") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}