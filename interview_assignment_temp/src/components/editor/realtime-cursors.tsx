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
  const lastManualPositionRef = useRef<{ x: number; y: number } | null>(null)
  const isManualMoveRef = useRef(false)
  const lastSentPositionRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const container = editorContainerRef.current
    if (!container) return

    let isMouseDown = false
    let ignoreSelectionChanges = false

    const getCursorPositionFromSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return null

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      return {
        x: rect.left - containerRect.left + (rect.width / 2),
        y: rect.top - containerRect.top + (rect.height / 2),
      }
    }

    const updateCursorPosition = (force = false) => {
      const position = getCursorPositionFromSelection()
      if (!position) return

      setOwnCursorPosition(position)
      
      // Only send manual cursor movements, not automatic ones from text changes
      if (force || (isManualMoveRef.current && !ignoreSelectionChanges)) {
        const now = Date.now()
        if (!lastSentPositionRef.current || 
            Math.abs(position.x - lastSentPositionRef.current.x) > 15 || 
            Math.abs(position.y - lastSentPositionRef.current.y) > 15 ||
            now - (lastSentPositionRef.time || 0) > 1000) {
          
          sendCursorPosition(position)
          lastSentPositionRef.current = position
          lastSentPositionRef.time = now
        }
      }
      
      // Reset manual move flag after a short delay
      if (isManualMoveRef.current) {
        setTimeout(() => {
          isManualMoveRef.current = false
          ignoreSelectionChanges = true
          setTimeout(() => {
            ignoreSelectionChanges = false
          }, 200)
        }, 100)
      }
    }

    const handleMouseDown = () => {
      isMouseDown = true
      isManualMoveRef.current = true
    }

    const handleMouseUp = () => {
      isMouseDown = false
      setTimeout(updateCursorPosition, 50)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('.ProseMirror')) {
        isManualMoveRef.current = true
        updateCursorPosition()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only for cursor movement keys, not typing
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
          e.key === 'Home' || e.key === 'End' || e.ctrlKey || e.metaKey) {
        isManualMoveRef.current = true
        setTimeout(updateCursorPosition, 100)
      }
    }

    // Prevent automatic cursor updates from text changes
    const handleSelectionChange = () => {
      if (!ignoreSelectionChanges) {
        // Don't update position automatically from selection changes
        setTimeout(() => {
          const position = getCursorPositionFromSelection()
          if (position) {
            setOwnCursorPosition(position)
          }
        }, 50)
      }
    }

    // Only listen to mouse events for cursor updates
    container.addEventListener("mousedown", handleMouseDown)
    container.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("selectionchange", handleSelectionChange)

    // Initial position
    updateCursorPosition(true)

    return () => {
      container.removeEventListener("mousedown", handleMouseDown)
      container.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("selectionchange", handleSelectionChange)
    }
  }, [sendCursorPosition, editorContainerRef])

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