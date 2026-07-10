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

export function useRealtimeCollaboration(documentId: string, userId: string, userName: string) {
  const [cursors, setCursors] = useState<Record<string, UserCursor>>({})
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const lastPositionRef = useRef<CursorPosition | null>(null)
  const lastCursorPositionRef = useRef<number>(0)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  useEffect(() => {
    if (!documentId) return

    // Connect to WebSocket server
    const connectSocket = () => {
      socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001", {
        path: "/socket.io",
        withCredentials: true,
        transports: ["websocket", "polling"],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      })

      socketRef.current.on("connect", () => {
        console.log("[realtime] connected to websocket")
        setIsConnected(true)
        reconnectAttempts.current = 0
        
        // Join document room
        socketRef.current?.emit("join-document", {
          documentId,
          userId,
          userName,
        })
      })

      socketRef.current.on("disconnect", (reason) => {
        console.log("[realtime] disconnected:", reason)
        setIsConnected(false)
      })

      socketRef.current.on("reconnect", () => {
        console.log("[realtime] reconnected")
        setIsConnected(true)
        reconnectAttempts.current = 0
      })

      socketRef.current.on("reconnect_error", (error) => {
        console.log("[realtime] reconnect error:", error)
        reconnectAttempts.current++
      })

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

      // Handle document updates
      socketRef.current.on("document-update", (data: {
        operation: any
        userId: string
        userName: string
        timestamp: string
      }) => {
        // Trigger local update through event or callback
        console.log("[realtime] document update:", data)
        window.dispatchEvent(new CustomEvent("document-update", { detail: data }))
      })

      // Handle user presence
      socketRef.current.on("user-joined", (data: { userId: string; name: string }) => {
        console.log("[realtime] user joined:", data)
        window.dispatchEvent(new CustomEvent("user-joined", { detail: data }))
      })

      socketRef.current.on("user-left", (data: { userId: string; name: string }) => {
        console.log("[realtime] user left:", data)
        window.dispatchEvent(new CustomEvent("user-left", { detail: data }))
      })
    }

    connectSocket()

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave-document", { documentId, userId })
        socketRef.current.disconnect()
      }
    }
  }, [documentId, userId, userName])

  const sendCursorPosition = (position: CursorPosition) => {
    if (socketRef.current && isConnected && position !== lastPositionRef.current) {
      // Throttle cursor updates to prevent flooding
      const now = Date.now()
      if (!lastCursorPositionRef.current || now - lastCursorPositionRef.current > 300) {
        socketRef.current.emit("cursor-position", {
          documentId,
          userId,
          userName,
          position,
        })
        lastPositionRef.current = position
        lastCursorPositionRef.current = now
      }
    }
  }

  const sendOperation = (operation: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("operation", {
        documentId,
        userId,
        userName,
        operation,
        timestamp: new Date().toISOString(),
      })
    }
  }

  return {
    cursors,
    isConnected,
    sendCursorPosition,
    sendOperation,
  }
}