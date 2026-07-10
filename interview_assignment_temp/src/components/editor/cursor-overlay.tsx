"use client"

import { useEffect, useRef } from "react"
import { useCursorPresence } from "@/hooks/use-cursor-presence"
import { User } from "lucide-react"

interface CursorOverlayProps {
  documentId: string
  userId: string
  userName: string
  editorContainerRef: React.RefObject<HTMLDivElement | null>
}

export function CursorOverlay({ documentId, userId, userName, editorContainerRef }: CursorOverlayProps) {
  const { cursors, sendCursorPosition } = useCursorPresence(documentId, userId, userName)
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current)
      }
      
      cursorTimeoutRef.current = setTimeout(() => {
        sendCursorPosition(position)
      }, 100)
    }

    container.addEventListener("mousemove", handleMouseMove)
    return () => {
      container.removeEventListener("mousemove", handleMouseMove)
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current)
      }
    }
  }, [sendCursorPosition, editorContainerRef.current])

  return (
    <div className="absolute inset-0 pointer-events-none">
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
          <div
            className="w-0.5 h-5"
            style={{ backgroundColor: cursor.color }}
          />
          <div
            className="px-2 py-1 text-xs font-medium rounded shadow-lg text-white"
            style={{ 
              backgroundColor: `${cursor.color}ee`,
              backdropFilter: "blur(4px)",
            }}
          >
            {cursor.name}
          </div>
        </div>
      ))}
    </div>
  )
}