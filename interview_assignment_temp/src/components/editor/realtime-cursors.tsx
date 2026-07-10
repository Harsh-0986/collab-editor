"use client"

import { useEffect, useRef } from "react"
import { useRealtimeCollaboration } from "@/hooks/use-realtime-collaboration"
import { User, Users } from "lucide-react"

interface RealtimeCursorsProps {
  documentId: string
  userId: string
  userName: string
  editorContainerRef: React.RefObject<HTMLDivElement | null>
}

export default function RealtimeCursors({ documentId, userId, userName, editorContainerRef }: RealtimeCursorsProps) {
  const { cursors, isConnected, sendCursorPosition } = useRealtimeCollaboration(
    documentId, 
    userId, 
    userName
  )

  const lastUpdateTimeRef = useRef(0)

  useEffect(() => {
    const container = editorContainerRef.current
    if (!container) return

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const position = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
      
      // Debounce cursor position updates
      const now = Date.now()
      if (!lastUpdateTimeRef.current || now - lastUpdateTimeRef.current > 100) {
        sendCursorPosition(position)
        lastUpdateTimeRef.current = now
      }
    }

    container.addEventListener("mousemove", handleMouseMove)
    return () => {
      container.removeEventListener("mousemove", handleMouseMove)
    }
  }, [sendCursorPosition, editorContainerRef])

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Connection status indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-50">
        <div className={`flex items-center gap-1 text-xs ${
          isConnected ? 'text-green-600' : 'text-yellow-600'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
          <span>{isConnected ? 'Live' : 'Connecting...'}</span>
          <Users className="w-3 h-3" />
          <span className="font-medium">{Object.keys(cursors).length}</span>
        </div>
      </div>

      {/* User cursors */}
      {Object.entries(cursors).map(([cursorUserId, cursor]) => (
        <div
          key={cursorUserId}
          className="absolute flex items-center gap-1 pointer-events-none transition-all duration-150 ease-out"
          style={{
            left: cursor.position.x,
            top: cursor.position.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {/* Cursor line */}
          <div
            className="w-0.5 h-5 animate-pulse"
            style={{ backgroundColor: cursor.color }}
          />
          
          {/* User name label */}
          <div
            className="px-2 py-1 text-xs font-medium rounded shadow-lg text-white border border-white/20 backdrop-blur-sm"
            style={{ 
              backgroundColor: `${cursor.color}ee`,
            }}
          >
            <div className="flex items-center gap-1">
              <User className="w-2 h-2" />
              {cursor.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}