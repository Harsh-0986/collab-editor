"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ConnectionState } from "@/types"

export function useConnection() {
  const [state, setState] = useState<ConnectionState>("online")
  const [lastHeartbeat, setLastHeartbeat] = useState<Date>(new Date())
  const failedChecks = useRef(0)

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health", { method: "GET", signal: AbortSignal.timeout(10000) })
      if (res.ok) {
        setState("online")
        setLastHeartbeat(new Date())
        failedChecks.current = 0
      } else {
        failedChecks.current++
        if (failedChecks.current >= 2) setState("offline")
      }
    } catch {
      failedChecks.current++
      if (failedChecks.current >= 2) setState("offline")
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setState("online")
      checkHealth()
    }
    const handleOffline = () => setState("offline")

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    const heartbeat = setInterval(checkHealth, 30000)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(heartbeat)
    }
  }, [checkHealth])

  return { state, lastHeartbeat, checkHealth }
}
