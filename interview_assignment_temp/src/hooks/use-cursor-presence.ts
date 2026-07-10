"use client"

import { useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import type { CursorPosition } from "@/types"

interface UserCursor {
  userId: string
  name: string
  position: CursorPosition
  color: string
}

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", 
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899"
]

export function useCursorPresence(documentId: string, userId: string, userName: string) {
  const [cursors, setCursors] = useState<Record<string, UserCursor>>({})
  const socketRef = useRef<Socket | null>(null)
  const lastPositionRef = useRef<CursorPosition | null>(null)

  useEffect(() => {
    if (!documentId) return

    // Connect to socket server
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000", {
      withCredentials: true,
    })

    // Join document room
    socketRef.current.emit("join-document", documentId)

    // Handle cursor updates from other users
    socketRef.current.on("cursor-update", (data: { userId: string; name: string; position: CursorPosition }) => {
      if (data.userId !== userId) {
        const color = COLORS[Math.abs(data.userId.charCodeAt(0)) % COLORS.length]
        setCursors(prev => ({
          ...prev,
          [data.userId]: {
            userId: data.userId,
            name: data.name,
            position: data.position,
            color,
          }
        }))
      }
    })

    // Handle user disconnect
    socketRef.current.on("user-disconnect", (disconnectedUserId: string) => {
      setCursors(prev => {
        const newCursors = { ...prev }
        delete newCursors[disconnectedUserId]
        return newCursors
      })
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave-document", documentId)
        socketRef.current.disconnect()
      }
    }
  }, [documentId, userId])

  const sendCursorPosition = (position: CursorPosition) => {
    if (socketRef.current && position !== lastPositionRef.current) {
      socketRef.current.emit("cursor-position", {
        documentId,
        userId,
        name: userName,
        position,
      })
      lastPositionRef.current = position
    }
  }

  return { cursors, sendCursorPosition }
}