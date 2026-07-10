"use client"

import { useEffect, useRef, useState } from "react"
import { useRealtimeCollaboration } from "@/hooks/use-realtime-collaboration"
import { User, Users } from "lucide-react"

interface RealtimeCursorsProps {
  documentId: string
  userId: string
  userName: string
  editorContainerRef: React.RefObject<HTMLDivElement | null>
}

interface CursorData {
  userId: string
  name: string
  position: { x: number; y: number }
  color: string
}

export default function RealtimeCursors({ documentId, userId, userName, editorContainerRef }: RealtimeCursorsProps) {
  const { cursors: remoteCursors, isConnected, sendCursorPosition } = useRealtimeCollaboration(
    documentId, 
    userId, 
    userName
  )

  const [allCursors, setAllCursors] = useState<CursorData[]>([])
  const [ownCursorPosition, setOwnCursorPosition] = useState<{ x: number; y: number } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const lastUpdateTimeRef = useRef(0)
  const lastSelectionRef = useRef<string>("")

  useEffect(() => {
    const container = editorContainerRef.current
    if (!container) return

    const updateCursorPosition = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const selectionString = range.toString()
      
      // Only update if selection changed (to prevent cursor jumping during typing)
      if (selectionString === lastSelectionRef.current) return
      lastSelectionRef.current = selectionString

      const rect = range.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      // Calculate position relative to editor container
      const position = {
        x: rect.left - containerRect.left + (rect.width / 2),
        y: rect.top - containerRect.top + (rect.height / 2),
      }
      
      setOwnCursorPosition(position)
      
      // Only send to other users if not actively editing
      if (!isEditing) {
        const now = Date.now()
        if (!lastUpdateTimeRef.current || now - lastUpdateTimeRef.current > 200) {
          sendCursorPosition(position)
          lastUpdateTimeRef.current = now
        }
      }
    }

    const handleSelectionChange = () => {
      updateCursorPosition()
    }

    // Listen for selection changes
    document.addEventListener("selectionchange", handleSelectionChange)
    
    // Listen for keyboard events
    const handleKeyDown = (e: KeyboardEvent) => {
      setIsEditing(true)
      setTimeout(() => {
        updateCursorPosition()
        // Stop editing after a short delay
        setTimeout(() => setIsEditing(false), 100)
      }, 0)
    }

    document.addEventListener("keydown", handleKeyDown)
    
    // Listen for mouse clicks (which change text cursor position)
    const handleClick = () => {
      setIsEditing(false)
      setTimeout(updateCursorPosition, 0)
    }

    document.addEventListener("click", handleClick)

    // Initial position
    updateCursorPosition()

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("click", handleClick)
    }
  }, [sendCursorPosition, editorContainerRef, isEditing])

  // Combine own cursor with remote cursors
  useEffect(() => {
    const remoteCursorsArray = Object.values(remoteCursors).filter(cursor => cursor.userId !== userId)
    const combinedCursors = [...remoteCursorsArray]
    
    if (ownCursorPosition) {
      // Add own cursor at the beginning
      combinedCursors.unshift({
        userId,
        name: userName,
        position: ownCursorPosition,
        color: "#3B82F6", // Blue for own cursor
      })
    }
    
    setAllCursors(combinedCursors)
  }, [remoteCursors, ownCursorPosition, userId, userName])

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
          <span className="font-medium">{allCursors.length}</span>
        </div>
      </div>

      {/* All cursors (including own) */}
      {allCursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute flex items-center gap-1 pointer-events-none transition-all duration-150 ease-out"
          style={{
            left: cursor.position.x,
            top: cursor.position.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {/* Text cursor - taller and more realistic */}
          <div
            className={`w-0.5 h-8 animate-pulse ${
              cursor.userId === userId ? 'bg-blue-500' : ''
            }`}
            style={{ 
              backgroundColor: cursor.color,
              boxShadow: `0 0 0 1px ${cursor.color}40`
            }}
          />
          
          {/* User name label - show for other users only */}
          {cursor.userId !== userId && (
            <div
              className="px-2 py-1 text-xs font-medium rounded shadow-lg text-white border border-white/20 backdrop-blur-sm whitespace-nowrap"
              style={{ 
                backgroundColor: `${cursor.color}ee`,
              }}
            >
              <div className="flex items-center gap-1">
                <User className="w-2 h-2" />
                {cursor.name}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}