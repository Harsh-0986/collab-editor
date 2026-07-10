import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/supabase-js"

export default async function EditorPage({
  params,
}: {
  params: { id: string }
}) {
  // For now, redirect to dashboard
  // In a real app, you would check permissions and load the document
  redirect("/")
}