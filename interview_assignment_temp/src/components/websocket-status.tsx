"use client"

import { useEffect, useState } from "react"
import { Wifi, WifiOff, Loader2 } from "lucide-react"

interface WebSocketStatusProps {
  url: string
}

export default function WebSocketStatus({ url }: WebSocketStatusProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    setIsConnecting(true)
    
    // Test WebSocket connection
    const ws = new WebSocket(url)
    
    ws.onopen = () => {
      setIsConnected(true)
      setIsConnecting(false)
    }
    
    ws.onerror = () => {
      setIsConnected(false)
      setIsConnecting(false)
    }
    
    ws.onclose = () => {
      setIsConnected(false)
      setIsConnecting(false)
    }

    // Cleanup
    return () => {
      ws.close()
    }
  }, [url])

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 text-sm text-yellow-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Connecting...</span>
      </div>
    )
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Wifi className="w-4 h-4" />
        <span>Connected</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-red-600">
      <WifiOff className="w-4 h-4" />
      <span>Disconnected</span>
    </div>
  )
}