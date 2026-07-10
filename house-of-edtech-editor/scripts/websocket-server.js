const { spawn } = require("child_process")

const server = spawn("node", ["-e", `
const { createServer } = require("http")
const { Server } = require("socket.io")
const { parse } = require("url")

const httpServer = createServer()
const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

const documents = new Map()

io.on("connection", (socket) => {
  console.log(\`User connected: \${socket.id}\`)

  socket.on("join-document", (documentId) => {
    socket.join(documentId)
    console.log(\`User \${socket.id} joined document \${documentId}\`)
    
    const document = documents.get(documentId)
    if (document) {
      socket.emit("document-state", document)
    }
  })

  socket.on("document-update", (data) => {
    const { documentId, content, operations } = data
    
    if (!documents.has(documentId)) {
      documents.set(documentId, { content, operations, version: 1 })
    } else {
      const doc = documents.get(documentId)
      doc.content = content
      doc.operations = [...doc.operations, ...operations]
      doc.version += 1
    }
    
    socket.to(documentId).emit("document-updated", {
      documentId,
      content,
      operations,
      version: documents.get(documentId).version
    })
  })

  socket.on("cursor-update", (data) => {
    const { documentId, position, selection } = data
    socket.to(documentId).emit("cursor-updated", {
      userId: socket.id,
      position,
      selection
    })
  })

  socket.on("user-presence", (data) => {
    const { documentId, user } = data
    socket.to(documentId).emit("user-joined", {
      userId: socket.id,
      user
    })
  })

  socket.on("disconnect", () => {
    console.log(\`User disconnected: \${socket.id}\`)
    io.sockets.adapter.rooms.forEach((room, roomId) => {
      if (socket.rooms.has(roomId)) {
        socket.to(roomId).emit("user-left", {
          userId: socket.id
        })
      }
    })
  })
})

const port = process.env.WS_PORT || 3001
httpServer.listen(port, () => {
  console.log(\`WebSocket server running on port \${port}\`)
})
`])

server.stdout.on("data", (data) => {
  console.log(\`[WebSocket] \${data}\`)
})

server.stderr.on("data", (data) => {
  console.error(\`[WebSocket Error] \${data}\`)
})

server.on("close", (code) => {
  console.log(\`WebSocket server exited with code \${code}\`)
})