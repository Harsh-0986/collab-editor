import type { Server as HTTPServer } from "http"
import type { Socket as NetSocket } from "net"
import type { Server as IOServer } from "socket.io"

export interface SocketServer extends HTTPServer {
  io?: IOServer<ClientToServerEvents, ServerToClientEvents> | undefined
}

export interface SocketWithIO extends NetSocket {
  server: SocketServer
}

export interface ServerToClientEvents {
  "document:updated": (data: { documentId: string; content: string; title: string; version: number; updatedBy: string }) => void
  "document:title:updated": (data: { documentId: string; title: string; version: number }) => void
  "document:snapshot:created": (data: { documentId: string; version: number; title: string }) => void
  "user:joined": (data: { userId: string; name: string }) => void
  "user:left": (data: { userId: string }) => void
  "cursor:update": (data: { userId: string; name: string; position: { from: number; to: number } | null }) => void
}

export interface ClientToServerEvents {
  "document:join": (data: { documentId: string }) => void
  "document:leave": (data: { documentId: string }) => void
  "document:update": (data: { documentId: string; content: string; title: string; version: number }) => void
  "document:title:update": (data: { documentId: string; title: string }) => void
  "document:snapshot:create": (data: { documentId: string; version: number; title: string; content: string }) => void
  "cursor:move": (data: { documentId: string; position: { from: number; to: number } | null }) => void
}
