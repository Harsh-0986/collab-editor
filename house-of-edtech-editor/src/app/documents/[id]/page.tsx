"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DocumentEditor } from "@/components/document-editor"
import { UsersDialog } from "@/components/users-dialog"
import { HistoryDialog } from "@/components/history-dialog"
import { useWebSocket } from "@/hooks/use-websocket"

interface DocumentPageProps {
  params: {
    id: string
  }
}

export default function DocumentPage({ params }: DocumentPageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [documentTitle, setDocumentTitle] = useState("Untitled Document")
  const [showUsersDialog, setShowUsersDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)

  // Mock document data - in a real app, this would come from the database
  const documentId = params.id
  const userId = session?.user?.id || "demo-user"
  const userName = session?.user?.name || "Demo User"

  // WebSocket hook for real-time collaboration
  const {
    isConnected,
    collaborators,
    documentVersion,
    sendDocumentUpdate,
    sendCursorUpdate
  } = useWebSocket({
    documentId,
    userId,
    userName
  })

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to continue</h1>
          <button 
            onClick={() => router.push("/api/auth/signin")}
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
      <DocumentEditor
        documentId={documentId}
        documentTitle={documentTitle}
        onTitleChange={setDocumentTitle}
        onShowUsers={() => setShowUsersDialog(true)}
        onShowHistory={() => setShowHistoryDialog(true)}
      />
      
      {/* Users Dialog */}
      <UsersDialog
        open={showUsersDialog}
        onOpenChange={setShowUsersDialog}
        collaborators={collaborators}
        isConnected={isConnected}
        documentVersion={documentVersion}
      />
      
      {/* History Dialog */}
      <HistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        documentId={documentId}
      />
    </>
  )
}