"use client"

import { useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"

interface UseWebSocketOptions {
  documentId: string
  userId: string
  userName: string
}

interface DocumentUpdate {
  documentId: string
  content: string
  operations: any[]
  version: number
}

interface CursorUpdate {
  userId: string
  position: { top: number; left: number }
  selection: { from: number; to: number }
}

interface UserPresence {
  userId: string
  user: { id: string; name: string; color: string }
}

export function useWebSocket({
  documentId,
  userId,
  userName
}: UseWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [collaborators, setCollaborators] = useState<Array<{
    id: string
    name: string
    color: string
    cursor: { top: number; left: number }
  }>>([])
  const [documentVersion, setDocumentVersion] = useState(0)

  useEffect(() => {
    // Connect to WebSocket server through Next.js API route
    socketRef.current = io("http://localhost:3000/api/socket", {
      transports: ["websocket"],
    })

    const socket = socketRef.current

    // Connection events
    socket.on("connect", () => {
      console.log("Connected to WebSocket server")
      setIsConnected(true)
      
      // Join the document room
      socket.emit("join-document", documentId)
      
      // Send user presence
      socket.emit("user-presence", {
        documentId,
        user: {
          id: userId,
          name: userName,
          color: getRandomColor()
        }
      })
    })

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket server")
      setIsConnected(false)
    })

    // Document events
    socket.on("document-state", (data: any) => {
      console.log("Received document state:", data)
      setDocumentVersion(data.version || 0)
    })

    socket.on("document-updated", (data: DocumentUpdate) => {
      console.log("Document updated:", data)
      setDocumentVersion(data.version)
    })

    // Cursor events
    socket.on("cursor-updated", (data: CursorUpdate) => {
      console.log("Cursor updated:", data)
      
      setCollaborators(prev => {
        const existing = prev.find(c => c.id === data.userId)
        if (existing) {
          return prev.map(c => 
            c.id === data.userId 
              ? { ...c, cursor: data.position }
              : c
          )
        } else {
          return [...prev, {
            id: data.userId,
            name: data.userId.substring(0, 8),
            color: getRandomColor(),
            cursor: data.position
          }]
        }
      })
    })

    // User presence events
    socket.on("user-joined", (data: { userId: string; user: any }) => {
      console.log("User joined:", data)
      setCollaborators(prev => {
        const existing = prev.find(c => c.id === data.userId)
        if (!existing) {
          return [...prev, {
            id: data.userId,
            name: data.user.name,
            color: data.user.color,
            cursor: { top: 0, left: 0 }
          }]
        }
        return prev
      })
    })

    socket.on("user-left", (data: { userId: string }) => {
      console.log("User left:", data)
      setCollaborators(prev => prev.filter(c => c.id !== data.userId))
    })

    // Cleanup on unmount
    return () => {
      socket.disconnect()
    }
  }, [documentId, userId, userName])

  const sendDocumentUpdate = (content: string, operations: any[]) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("document-update", {
        documentId,
        content,
        operations
      })
    }
  }

  const sendCursorUpdate = (position: { top: number; left: number }, selection: { from: number; to: number }) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("cursor-update", {
        documentId,
        position,
        selection
      })
    }
  }

  return {
    isConnected,
    collaborators,
    documentVersion,
    sendDocumentUpdate,
    sendCursorUpdate
  }
}

function getRandomColor() {
  const colors = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}