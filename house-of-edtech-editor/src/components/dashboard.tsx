"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { format } from "date-fns"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, Users, Calendar, Edit } from "lucide-react"
import { format } from "date-fns"

interface Document {
  id: string
  title: string
  updatedAt: string
  owner: {
    name: string
    email: string
  }
  members: Array<{
    user: {
      name: string
      email: string
    }
    role: string
  }>
}

export function Dashboard() {
  const { data: session } = useSession()
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Mock data for demo
  const mockDocuments: Document[] = [
    {
      id: "1",
      title: "Welcome to House of Edtech Editor",
      updatedAt: new Date().toISOString(),
      owner: {
        name: "Demo User",
        email: "demo@houseofedtech.app"
      },
      members: [
        {
          user: {
            name: "Demo User",
            email: "demo@houseofedtech.app"
          },
          role: "OWNER"
        }
      ]
    },
    {
      id: "2",
      title: "Project Requirements",
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      owner: {
        name: "Demo User",
        email: "demo@houseofedtech.app"
      },
      members: [
        {
          user: {
            name: "Demo User",
            email: "demo@houseofedtech.app"
          },
          role: "OWNER"
        }
      ]
    }
  ]

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setDocuments(mockDocuments)
      setIsLoading(false)
    }, 1000)
  }, [])

  const handleNewDocument = () => {
    // In a real app, this would create a new document
    console.log("Create new document")
  }

  const handleOpenDocument = (id: string) => {
    // In a real app, this would navigate to the document editor
    console.log("Open document:", id)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-green-100 text-green-800"
      case "EDITOR":
        return "bg-blue-100 text-blue-800"
      case "VIEWER":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNewDocument={handleNewDocument} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {session?.user?.name}!
            </p>
          </div>
          
          <Button onClick={handleNewDocument}>
            <Plus className="h-4 w-4 mr-2" />
            New Document
          </Button>
        </div>
        
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No documents yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first collaborative document to get started
            </p>
            <Button onClick={handleNewDocument}>
              <Plus className="h-4 w-4 mr-2" />
              Create Document
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">
                        {doc.title}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        Owned by {doc.owner.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDocument(doc.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {doc.members.length} member{doc.members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Updated {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 pt-2">
                      {doc.members.slice(0, 3).map((member, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <span className="text-sm text-gray-600">
                            {member.user.name}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getRoleBadgeColor(member.role)}`}
                          >
                            {member.role}
                          </Badge>
                        </div>
                      ))}
                      {doc.members.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{doc.members.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    className="w-full mt-4"
                    onClick={() => handleOpenDocument(doc.id)}
                  >
                    Open Document
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}