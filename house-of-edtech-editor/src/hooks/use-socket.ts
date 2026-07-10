"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket-client"
import type { Socket } from "socket.io-client"
import type { ClientToServerEvents, ServerToClientEvents } from "@/types/socket"

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>

export default function useSocket(documentId: string | undefined) {
  const { data: session } = useSession()
  const socketRef = useRef<SocketType | null>(null)

  useEffect(() => {
    if (!documentId || !session?.user?.id) return

    const sock = connectSocket(session.user.id, session.user.name ?? "Unknown")
    socketRef.current = sock

    sock.emit("document:join", { documentId })

    return () => {
      sock.emit("document:leave", { documentId })
    }
  }, [documentId, session?.user?.id])

  useEffect(() => {
    return () => {
      disconnectSocket()
    }
  }, [])

  const emit = useCallback(<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) => {
    socketRef.current?.emit(event, ...args)
  }, [])

  const on = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K],
  ) => {
    const sock = socketRef.current ?? getSocket()
    if (!sock) return () => {}
    sock.on(event, handler as any)
    return () => {
      sock.off(event, handler as any)
    }
  }, [])

  return { emit, on }
}
