import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "./db"
import type { Role } from "@/types"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        const email = credentials.email as string
        const name = credentials.name as string | undefined

        let user = await db.user.findUnique({ where: { email } })

        if (!user && name) {
          user = await db.user.create({
            data: { email, name, image: null },
          })
        }

        if (!user) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})

export async function getDocumentRole(
  documentId: string,
  userId: string
): Promise<Role | null> {
  const member = await db.documentMember.findUnique({
    where: { documentId_userId: { documentId, userId } },
  })
  return member?.role as Role | null
}

export async function requireRole(
  documentId: string,
  userId: string,
  allowedRoles: Role[]
): Promise<boolean> {
  const role = await getDocumentRole(documentId, userId)
  return role !== null && allowedRoles.includes(role)
}