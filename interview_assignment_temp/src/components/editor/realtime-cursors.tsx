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
  const [isMovingCursor, setIsMovingCursor] = useState(false)
  const lastUpdateTimeRef = useRef(0)
  const lastSelectionRef = useRef<string>("")
  const lastCursorPositionRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const container = editorContainerRef.current
    if (!container) return

    const updateCursorPosition = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const selectionString = range.toString()
      
      // Only update if selection actually changed
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
      
      // Only send cursor updates when user is actively moving cursor (not during typing/editing)
      if (!isEditing && !isMovingCursor) {
        const now = Date.now()
        if (!lastCursorPositionRef.current || 
            Math.abs(position.x - lastCursorPositionRef.current.x) > 5 || 
            Math.abs(position.y - lastCursorPositionRef.current.y) > 5 ||
            now - lastUpdateTimeRef.current > 1000) {
          
          sendCursorPosition(position)
          lastCursorPositionRef.current = position
          lastUpdateTimeRef.current = now
        }
      }
    }

    const handleSelectionChange = () => {
      // Don't send cursor updates during content changes
      setTimeout(() => {
        updateCursorPosition()
      }, 100)
    }

    // Listen for selection changes
    document.addEventListener("selectionchange", handleSelectionChange)
    
    // Listen for keyboard events (only for actual cursor movement, not typing)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
          e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
        setIsMovingCursor(true)
        setTimeout(() => setIsMovingCursor(false), 200)
      }
      
      setIsEditing(true)
      setTimeout(() => {
        setIsEditing(false)
        // After editing stops, update cursor position
        setTimeout(updateCursorPosition, 50)
      }, 100)
    }

    document.addEventListener("keydown", handleKeyDown)
    
    // Listen for mouse clicks and movements (cursor positioning)
    const handleClick = (e: MouseEvent) => {
      setIsEditing(false)
      setIsMovingCursor(true)
      setTimeout(() => {
        setIsMovingCursor(false)
        updateCursorPosition()
      }, 100)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('.ProseMirror')) {
        setIsMovingCursor(true)
        setTimeout(() => {
          setIsMovingCursor(false)
          updateCursorPosition()
        }, 100)
      }
    }

    document.addEventListener("click", handleClick)
    document.addEventListener("mousemove", handleMouseMove)

    // Initial position
    updateCursorPosition()

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("click", handleClick)
      document.removeEventListener("mousemove", handleMouseMove)
    }
  }, [sendCursorPosition, editorContainerRef, isEditing, isMovingCursor])

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