"use client"

import { useEffect, useState } from "react"
import { useRealtimeCollaboration } from "@/hooks/use-realtime-collaboration"
import { Users, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CollaborationStatusProps {
  documentId: string
  userId: string
  userName: string
  onInvite?: () => void
}

export default function CollaborationStatus({ documentId, userId, userName, onInvite }: CollaborationStatusProps) {
  const { cursors, isConnected } = useRealtimeCollaboration(documentId, userId, userName)
  const [activeUsers, setActiveUsers] = useState<Array<{userId: string, name: string}>>([])

  useEffect(() => {
    const handleUserJoined = (event: CustomEvent) => {
      setActiveUsers(prev => [...prev, event.detail])
    }

    const handleUserLeft = (event: CustomEvent) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== event.detail.userId))
    }

    window.addEventListener("user-joined", handleUserJoined as EventListener)
    window.addEventListener("user-left", handleUserLeft as EventListener)
    
    return () => {
      window.removeEventListener("user-joined", handleUserJoined as EventListener)
      window.removeEventListener("user-left", handleUserLeft as EventListener)
    }
  }, [])

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 ${
          isConnected ? 'text-green-600' : 'text-yellow-600'
        }`}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span className="font-medium">
            {isConnected ? 'Live' : 'Connecting...'}
          </span>
        </div>
        
        <div className="flex items-center gap-1 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span className="font-medium">
            {Object.keys(cursors).length + 1}
          </span>
        </div>
      </div>

      {Object.entries(cursors).map(([cursorUserId, cursor]) => (
        <div 
          key={cursorUserId}
          className="flex items-center gap-1 text-xs text-muted-foreground"
          style={{ color: cursor.color }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cursor.color }} />
          {cursor.name}
        </div>
      ))}

      {onInvite && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={onInvite}
          className="text-xs"
        >
          Invite
        </Button>
      )}
    </div>
  )
}