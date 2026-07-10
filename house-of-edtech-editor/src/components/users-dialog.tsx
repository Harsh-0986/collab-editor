"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Users, 
  Wifi, 
  WifiOff, 
  Clock,
  UserPlus,
  Settings
} from "lucide-react"
import { format } from "date-fns"

interface UsersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collaborators: Array<{
    id: string
    name: string
    color: string
    cursor: { top: number; left: number }
  }>
  isConnected: boolean
  documentVersion: number
}

export function UsersDialog({
  open,
  onOpenChange,
  collaborators,
  isConnected,
  documentVersion
}: UsersDialogProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Document Collaborators
          </DialogTitle>
          <DialogDescription>
            Manage who can edit this document and see who's currently working on it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Connection status */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-yellow-500" />
            )}
            <span className="text-sm">
              {isConnected ? "Connected to real-time sync" : "Offline mode"}
            </span>
          </div>
          
          {/* Document info */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Version {documentVersion}
                </span>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
          
          {/* Active collaborators */}
          <div>
            <h4 className="text-sm font-medium mb-3">Active now ({collaborators.length})</h4>
            <div className="space-y-2">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedUser(collaborator.id)}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: collaborator.color }}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={collaborator.name} />
                    <AvatarFallback>
                      {collaborator.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{collaborator.name}</p>
                    <p className="text-xs text-gray-500">Editing now</p>
                  </div>
                  <Badge className={getRoleBadgeColor("EDITOR")}>
                    Editor
                  </Badge>
                </div>
              ))}
              
              {collaborators.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active collaborators</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Invite collaborators */}
          <div>
            <h4 className="text-sm font-medium mb-3">Add collaborators</h4>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite by email
              </Button>
              <Button variant="outline">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}