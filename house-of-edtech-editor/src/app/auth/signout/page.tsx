import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function SignOutPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/")
  }

  // In a real app, you would actually sign out here
  // For now, just redirect to home
  redirect("/")
}