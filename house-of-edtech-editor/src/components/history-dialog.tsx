"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  History, 
  Clock, 
  User, 
  RotateCcw,
  Trash2,
  Download
} from "lucide-react"
import { format } from "date-fns"

interface HistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
}

interface HistoryItem {
  id: string
  version: number
  timestamp: string
  author: {
    id: string
    name: string
    email: string
  }
  changes: string[]
  size: number
}

export function HistoryDialog({
  open,
  onOpenChange,
  documentId
}: HistoryDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)

  // Mock history data - in a real app, this would come from the database
  const history: HistoryItem[] = [
    {
      id: "1",
      version: 15,
      timestamp: new Date().toISOString(),
      author: {
        id: "user1",
        name: "Demo User",
        email: "demo@houseofedtech.app"
      },
      changes: ["Added introduction section", "Formatted text"],
      size: 2048
    },
    {
      id: "2",
      version: 14,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      author: {
        id: "user1",
        name: "Demo User",
        email: "demo@houseofedtech.app"
      },
      changes: ["Created new document"],
      size: 1024
    }
  ]

  const handleRestore = (versionId: string) => {
    console.log("Restore to version:", versionId)
    // In a real app, this would restore the document to this version
  }

  const handleDelete = (versionId: string) => {
    console.log("Delete version:", versionId)
    // In a real app, this would delete this version
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Document History
          </DialogTitle>
          <DialogDescription>
            View and restore previous versions of this document.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current version */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">Current Version</p>
                <p className="text-sm text-green-600">
                  Last saved: {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">
                v{history[0]?.version || 1}
              </Badge>
            </div>
          </div>
          
          {/* Version history */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((item) => (
              <div
                key={item.id}
                className={`p-4 border rounded-lg ${
                  selectedVersion === item.id 
                    ? "border-blue-300 bg-blue-50" 
                    : "hover:bg-gray-50"
                }`}
                onClick={() => setSelectedVersion(item.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {format(new Date(item.timestamp), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        v{item.version}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {item.author.name} ({item.author.email})
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {item.changes.map((change, index) => (
                        <p key={index} className="text-sm text-gray-600">
                          • {change}
                        </p>
                      ))}
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-2">
                      {formatFileSize(item.size)}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRestore(item.id)
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(item.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Export options */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export as PDF
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export as Word
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}