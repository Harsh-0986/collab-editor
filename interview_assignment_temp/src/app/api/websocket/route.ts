import { NextRequest, NextResponse } from "next/server"
import { Server } from "socket.io"
import { createServer } from "http"

// Create HTTP server
const httpServer = createServer()

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  connectTimeout: 10000,
  pingTimeout: 5000,
  pingInterval: 25000,
})

// Track document rooms and user connections
const documentRooms = new Map<string, Set<string>>()
const userConnections = new Map<string, { userId: string; name: string; documentId: string }>()
const userCursors = new Map<string, { position: any; lastSeen: number }>()

io.on("connection", (socket) => {
  console.log(`[websocket] User connected: ${socket.id}`)

  socket.on("join-document", (data: { documentId: string; userId: string; userName: string }) => {
    console.log(`[websocket] User ${data.userId} joining document: ${data.documentId}`)
    
    // Store user info
    userConnections.set(socket.id, {
      userId: data.userId,
      name: data.userName,
      documentId: data.documentId,
    })

    // Add user to document room
    if (!documentRooms.has(data.documentId)) {
      documentRooms.set(data.documentId, new Set())
    }
    documentRooms.get(data.documentId)!.add(socket.id)

    // Notify other users in the document
    socket.to(data.documentId).emit("user-joined", {
      userId: data.userId,
      name: data.userName,
    })

    // Send current users in the document to the new user
    const usersInDocument = Array.from(documentRooms.get(data.documentId)!)
      .filter(id => id !== socket.id)
      .map(id => userConnections.get(id))

    socket.emit("current-users", usersInDocument.filter(Boolean))

    console.log(`[websocket] Document ${data.documentId} has ${usersInDocument.length + 1} users`)
  })

  socket.on("cursor-position", (data: {
    documentId: string
    userId: string
    userName: string
    position: any
  }) => {
    // Store cursor position
    userCursors.set(socket.id, {
      position: data.position,
      lastSeen: Date.now(),
    })

    // Broadcast cursor position to other users in the same document
    socket.to(data.documentId).emit("cursor-update", {
      userId: data.userId,
      name: data.userName,
      position: data.position,
    })
  })

  socket.on("operation", (data: {
    documentId: string
    userId: string
    userName: string
    operation: any
    timestamp: string
  }) => {
    // Broadcast operation to other users in the same document
    socket.to(data.documentId).emit("document-update", {
      operation: data.operation,
      userId: data.userId,
      userName: data.userName,
      timestamp: data.timestamp,
    })
  })

  socket.on("disconnect", (reason) => {
    console.log(`[websocket] User disconnected: ${socket.id}, reason: ${reason}`)

    // Remove user from all document rooms
    const userConnection = userConnections.get(socket.id)
    if (userConnection) {
      const { documentId, userId, name } = userConnection
      
      if (documentRooms.has(documentId)) {
        documentRooms.get(documentId)!.delete(socket.id)
        
        // Notify other users
        io.to(documentId).emit("user-left", {
          userId,
          name,
        })
        
        // Clean up empty rooms
        if (documentRooms.get(documentId)!.size === 0) {
          documentRooms.delete(documentId)
        }
      }

      userConnections.delete(socket.id)
      userCursors.delete(socket.id)
    }
  })
})

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    connectedClients: io.engine.clientsCount,
    documentRooms: documentRooms.size,
    timestamp: new Date().toISOString() 
  })
}

export async function POST() {
  return NextResponse.json({ status: "ok" })
}

// Start the server only in development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.WS_PORT || 3001
  httpServer.listen(PORT, () => {
    console.log(`[websocket] Socket.IO server running on port ${PORT}`)
  })
}