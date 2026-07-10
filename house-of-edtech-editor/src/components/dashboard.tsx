"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDocumentList, useCreateDocument, useSyncStatus } from "@/hooks/use-local-document"
import { FileText, Plus, Edit, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { format } from "date-fns"

export function Dashboard() {
  const { data: session } = useSession()
  const { documents, loading } = useDocumentList()
  const { create, creating } = useCreateDocument()
  const syncStatus = useSyncStatus()
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)

  const handleNewDocument = async () => {
    if (!session?.user?.id) return
    const doc = await create("Untitled Document", session.user.id)
    if (doc) {
      window.location.href = `/documents/${doc.id}`
    }
  }

  const handleOpenDocument = (id: string) => {
    window.location.href = `/documents/${id}`
  }

  const statusIcon = {
    idle: <Wifi className="h-4 w-4 text-green-500" />,
    syncing: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
    offline: <WifiOff className="h-4 w-4 text-yellow-500" />,
    error: <WifiOff className="h-4 w-4 text-red-500" />,
    conflict: <RefreshCw className="h-4 w-4 text-orange-500" />,
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onNewDocument={handleNewDocument} />

      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {session?.user?.name}!
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border text-sm">
              {statusIcon[syncStatus]}
              <span className="text-gray-600">
                {syncStatus === "idle"
                  ? "All changes saved"
                  : syncStatus === "syncing"
                    ? "Syncing..."
                    : syncStatus === "offline"
                      ? "Working offline"
                      : syncStatus === "conflict"
                        ? "Resolving..."
                        : "Sync error"}
              </span>
            </div>

            <Button onClick={handleNewDocument} disabled={creating}>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded mb-4" />
                <div className="h-3 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No documents yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Your documents are stored locally and sync to the cloud when you are online.
              Create your first document to get started.
            </p>
            <Button onClick={handleNewDocument} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create Document
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                className={`hover:shadow-lg transition-shadow cursor-pointer ${
                  selectedDoc === doc.id ? "ring-2 ring-blue-400" : ""
                }`}
                onClick={() => setSelectedDoc(doc.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {doc.title}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        v{doc.version} · Updated {format(doc.updatedAt, "MMM d, yyyy")}
                      </p>
                    </div>
                    {doc.isDirty && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-yellow-400 mt-2" />
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {doc.content
                      ? doc.content.replace(/<[^>]+>/g, "").slice(0, 200)
                      : "Empty document"}
                  </p>

                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenDocument(doc.id)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}