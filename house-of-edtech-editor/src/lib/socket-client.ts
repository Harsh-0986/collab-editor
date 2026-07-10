import { io, type Socket } from "socket.io-client"
import type { ClientToServerEvents, ServerToClientEvents } from "@/types/socket"

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  return socket
}

export function connectSocket(userId: string, userName: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socket?.connected) return socket

  socket = io({ path: "/api/socketio", transports: ["polling", "websocket"], autoConnect: false })
  socket.auth = { userId, userName }
  socket.connect()

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
