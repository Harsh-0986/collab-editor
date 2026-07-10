import type { NextApiRequest, NextApiResponse } from "next"
import { Server as IOServer } from "socket.io"
import type { SocketServer, ClientToServerEvents, ServerToClientEvents } from "@/types/socket"
import { prisma } from "@/lib/db"

export const config = {
  api: {
    bodyParser: false,
  },
}

const ioHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const socket = res.socket as unknown as { server: SocketServer }
  if (!socket.server.io) {
    const io = new IOServer<ClientToServerEvents, ServerToClientEvents>(socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
      cors: { origin: "*", methods: ["GET", "POST"] },
    })

    io.on("connection", (socket) => {
      let currentUserId: string | null = null

      socket.on("document:join", async ({ documentId }) => {
        const userId = socket.data.userId as string | undefined
        if (!userId) return
        currentUserId = userId

        socket.join(documentId)
        socket.to(documentId).emit("user:joined", {
          userId,
          name: (socket.data.userName as string) ?? "Unknown",
        })
      })

      socket.on("document:leave", ({ documentId }) => {
        socket.leave(documentId)
        if (currentUserId) {
          socket.to(documentId).emit("user:left", { userId: currentUserId })
        }
      })

      socket.on("document:update", async ({ documentId, content, title, version }) => {
        const userId = socket.data.userId as string | undefined
        if (!userId) return

        try {
          const doc = await prisma.document.findUnique({ where: { id: documentId } })
          if (!doc) return

          const canEdit = doc.ownerId === userId
          if (!canEdit) {
            const member = await prisma.documentMember.findUnique({
              where: { documentId_userId: { documentId, userId } },
            })
            if (!member || member.role === "VIEWER") return
          }

          await prisma.document.update({
            where: { id: documentId },
            data: { content, title, version },
          })

          socket.to(documentId).emit("document:updated", {
            documentId,
            content,
            title,
            version,
            updatedBy: userId,
          })
        } catch {}
      })

      socket.on("document:title:update", async ({ documentId, title }) => {
        const userId = socket.data.userId as string | undefined
        if (!userId) return

        try {
          await prisma.document.update({
            where: { id: documentId },
            data: { title },
          })
          socket.to(documentId).emit("document:title:updated", { documentId, title, version: 0 })
        } catch {}
      })

      socket.on("document:snapshot:create", async ({ documentId, version, title, content }) => {
        const userId = socket.data.userId as string | undefined
        if (!userId) return

        try {
          await prisma.documentSnapshot.create({
            data: { documentId, version, content, createdBy: userId },
          })
          socket.to(documentId).emit("document:snapshot:created", { documentId, version, title })
        } catch {}
      })

      socket.on("cursor:move", ({ documentId, position }) => {
        const userId = socket.data.userId as string | undefined
        const userName = socket.data.userName as string | undefined
        if (!userId) return
        socket.to(documentId).emit("cursor:update", {
          userId,
          name: userName ?? "Unknown",
          position,
        })
      })

      socket.on("disconnect", () => {
        if (currentUserId) {
          const roomIds = Array.from(socket.rooms)
          for (const room of roomIds) {
            if (room !== socket.id) {
              socket.to(room).emit("user:left", { userId: currentUserId })
            }
          }
        }
      })
    })

    socket.server.io = io
  }

  res.status(200).end()
}

export default ioHandler
