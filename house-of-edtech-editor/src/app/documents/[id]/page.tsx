"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DocumentEditor } from "@/components/document-editor"
import { Footer } from "@/components/footer"

export default function DocumentPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const router = useRouter()

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to continue</h1>
          <button
            onClick={() => router.push("/signin")}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <DocumentEditor documentId={params.id} />
      <Footer />
    </>
  )
}