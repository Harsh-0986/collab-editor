"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Loader2 } from "lucide-react"
import type { AIRequest } from "@/types"

interface AIPanelProps {
  documentContent: string
}

export function AIPanel({ documentContent }: AIPanelProps) {
  const [action, setAction] = useState<AIRequest["action"]>("SUMMARIZE")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleAI = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          document: documentContent,
        } satisfies AIRequest),
      })

      const data = await res.json()

      if (data.success && data.data?.result) {
        setResult(data.data.result)
      } else {
        setResult(data.error?.message || "AI request failed")
      }
    } catch {
      setResult("Failed to reach AI service")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        <div className="flex gap-2">
          <Select value={action} onValueChange={(v) => setAction(v as AIRequest["action"])}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SUMMARIZE">Summarize</SelectItem>
              <SelectItem value="REWRITE">Rewrite</SelectItem>
              <SelectItem value="TITLE">Generate Title</SelectItem>
              <SelectItem value="EXPLAIN">Explain</SelectItem>
              <SelectItem value="CONTINUE">Continue</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={handleAI} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Run
          </Button>
        </div>
        {result && (
          <div className="text-sm bg-zinc-50 dark:bg-zinc-800 p-3 rounded max-h-40 overflow-y-auto whitespace-pre-wrap">
            {result}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
