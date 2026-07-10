import { Server } from "socket.io"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const server = new Server({
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

  // Mock document data
  const documents = new Map<string, any>()
  
  // Handle connections
  server.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`)

    // Join document room
    socket.on("join-document", (documentId: string) => {
      socket.join(documentId)
      console.log(`User ${socket.id} joined document ${documentId}`)
      
      // Send current document state
      const document = documents.get(documentId)
      if (document) {
        socket.emit("document-state", document)
      }
    })

    // Handle document updates
    socket.on("document-update", (data: {
      documentId: string
      content: string
      operations: any[]
    }) => {
      const { documentId, content, operations } = data
      
      // Update document
      if (!documents.has(documentId)) {
        documents.set(documentId, { content, operations, version: 1 })
      } else {
        const doc = documents.get(documentId)
        doc.content = content
        doc.operations = [...doc.operations, ...operations]
        doc.version += 1
      }
      
      // Broadcast to other users in the same document
      socket.to(documentId).emit("document-updated", {
        documentId,
        content,
        operations,
        version: documents.get(documentId).version
      })
    })

    // Handle cursor position updates
    socket.on("cursor-update", (data: {
      documentId: string
      position: { top: number; left: number }
      selection: { from: number; to: number }
    }) => {
      const { documentId, position, selection } = data
      
      // Broadcast to other users in the same document
      socket.to(documentId).emit("cursor-updated", {
        userId: socket.id,
        position,
        selection
      })
    })

    // Handle user presence
    socket.on("user-presence", (data: {
      documentId: string
      user: { id: string; name: string; color: string }
    }) => {
      const { documentId, user } = data
      
      // Broadcast to other users in the same document
      socket.to(documentId).emit("user-joined", {
        userId: socket.id,
        user
      })
    })

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`)
      
      // Notify other users in document rooms
      server.sockets.adapter.rooms.forEach((room, roomId) => {
        if (socket.rooms.has(roomId)) {
          socket.to(roomId).emit("user-left", {
            userId: socket.id
          })
        }
      })
    })
  })

  // Start the server
  server.listen(3001)

  return NextResponse.json({ 
    message: "WebSocket server started on port 3001" 
  })
}