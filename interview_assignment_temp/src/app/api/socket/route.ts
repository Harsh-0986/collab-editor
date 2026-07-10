import { NextRequest, NextResponse } from "next/server"

let io: any = null

export async function GET() {
  if (!io) {
    const { Server } = await import('socket.io')
    const { createServer } = await import('http')
    
    const httpServer = createServer()
    
    io = new Server(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000"],
        methods: ["GET", "POST"],
      },
    })

    io.on("connection", (socket: any) => {
      console.log(`Client connected: ${socket.id}`)

      socket.on("join-document", (data: { documentId: string; userId: string; userName: string }) => {
        console.log(`User ${data.userId} joining document: ${data.documentId}`)
        socket.join(data.documentId)
        
        // Notify others in the document
        socket.to(data.documentId).emit("user-joined", {
          userId: data.userId,
          name: data.userName,
        })
      })

      socket.on("cursor-position", (data: { documentId: string; userId: string; userName: string; position: any }) => {
        socket.to(data.documentId).emit("cursor-update", {
          userId: data.userId,
          name: data.userName,
          position: data.position,
        })
      })

      socket.on("operation", (data: { documentId: string; userId: string; userName: string; operation: any; timestamp: string }) => {
        socket.to(data.documentId).emit("document-update", {
          operation: data.operation,
          userId: data.userId,
          userName: data.userName,
          timestamp: data.timestamp,
        })
      })

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`)
      })
    })

    // Start server on port 3001
    const PORT = 3001
    httpServer.listen(PORT, () => {
      console.log(`Socket.IO server running on port ${PORT}`)
    })
  }

  return NextResponse.json({ status: "ok" })
}

export async function POST() {
  return NextResponse.json({ status: "ok" })
}