import { NextRequest, NextResponse } from "next/server"
import { Server } from "socket.io"

// In-memory storage for demo purposes
// In production, use Redis or similar for multi-instance support
const documents = new Map<string, any>()
const ioServers = new Map<string, any>()

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: "WebSocket server is running through Next.js API routes" 
  })
}

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    // Create Socket.IO server for this document
    if (!ioServers.has(documentId)) {
      const io = new Server({
        path: "/api/socket",
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
        },
      })

      // Handle connections
      io.on("connection", (socket) => {

        // Join document room
        socket.on("join-document", (docId: string) => {
          socket.join(docId)
          
          // Send current document state
          const document = documents.get(docId)
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
          const { documentId: docId, content, operations } = data
          
          // Update document
          if (!documents.has(docId)) {
            documents.set(docId, { content, operations, version: 1 })
          } else {
            const doc = documents.get(docId)
            doc.content = content
            doc.operations = [...doc.operations, ...operations]
            doc.version += 1
          }
          
          // Broadcast to other users in the same document
          socket.to(docId).emit("document-updated", {
            documentId: docId,
            content,
            operations,
            version: documents.get(docId).version
          })
        })

        // Handle cursor position updates
        socket.on("cursor-update", (data: {
          documentId: string
          position: { top: number; left: number }
          selection: { from: number; to: number }
        }) => {
          const { documentId: docId, position, selection } = data
          
          // Broadcast to other users in the same document
          socket.to(docId).emit("cursor-updated", {
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
          const { documentId: docId, user } = data
          
          // Broadcast to other users in the same document
          socket.to(docId).emit("user-joined", {
            userId: socket.id,
            user
          })
        })

        // Handle disconnection
        socket.on("disconnect", () => {
          
          // Notify other users in document rooms
          io.sockets.adapter.rooms.forEach((room, roomId) => {
            if (socket.rooms.has(roomId)) {
              socket.to(roomId).emit("user-left", {
                userId: socket.id
              })
            }
          })
        })
      })

      ioServers.set(documentId, io)
      
      // Start the server
      io.listen(3001, documentId)
      
      return NextResponse.json({ 
        message: `WebSocket server started for document ${documentId}`,
        documentId
      })
    }

    return NextResponse.json({ 
      message: `WebSocket server already exists for document ${documentId}`,
      documentId
    })
  } catch (error) {
    console.error("Error starting WebSocket server:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}