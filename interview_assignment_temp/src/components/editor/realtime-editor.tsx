"use client"

import { useEffect, useRef, useState } from "react"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import { EditorToolbar } from "./editor-toolbar"
import { useRealtimeCollaboration } from "@/hooks/use-realtime-collaboration"
import type { StoredDocument } from "@/types"

interface EditorProps {
  document: StoredDocument | null
  onContentChange?: (content: Record<string, unknown>) => void
  onOperation?: (type: string, payload: Record<string, unknown>, lamport: number) => void
  readOnly?: boolean
  currentLamport?: number
  userId?: string
  userName?: string
}

interface ContentHighlight {
  id: string
  userId: string
  userName: string
  content: string
  position: { top: number; left: number }
  color: string
}

export default function RealtimeEditor({ 
  document: doc, 
  onContentChange, 
  onOperation, 
  readOnly = false, 
  currentLamport = 0,
  userId,
  userName = "You"
}: EditorProps) {
  const lamportRef = useRef(currentLamport)
  const lastContentRef = useRef("")
  const editorContainerRef = useRef<HTMLDivElement | null>(null)
  const [contentHighlights, setContentHighlights] = useState<ContentHighlight[]>([])
  
  const { isConnected, sendOperation } = useRealtimeCollaboration(
    doc?.id || "",
    userId || "",
    userName
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        underline: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
    ],
    content: doc?.content || {
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    },
    editable: !readOnly,
    immediatelyRender: true,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-6 relative",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      if (html === lastContentRef.current) return
      lastContentRef.current = html

      const json = ed.getJSON() as Record<string, unknown>
      onContentChange?.(json)

      if (onOperation && !readOnly) {
        const newLamport = lamportRef.current + 1
        const operation = {
          type: "INSERT",
          payload: { content: json, html },
          lamport: newLamport,
          timestamp: new Date().toISOString(),
        }
        
        // Send operation to other users in real-time
        sendOperation(operation)
        
        // Also call local operation handler for persistence
        onOperation("INSERT", { content: json, html }, newLamport)
      }
    },
  })

  useEffect(() => {
    if (editor && doc?.content) {
      const currentJson = JSON.stringify(editor.getJSON())
      const newJson = JSON.stringify(doc.content)
      if (currentJson !== newJson && doc.content.type === "doc") {
        editor.commands.setContent(doc.content)
      }
    }
  }, [doc?.id, doc?.content, editor])

  useEffect(() => {
    lamportRef.current = currentLamport
  }, [currentLamport])

  useEffect(() => {
    return () => editor?.destroy()
  }, [editor])

  // Listen for real-time document updates
  useEffect(() => {
    const handleDocumentUpdate = (event: CustomEvent) => {
      const { operation, userId: remoteUserId } = event.detail
      if (remoteUserId !== userId && operation.payload?.content) {
        // Apply remote operation to editor
        const content = operation.payload.content
        if (content && content.type === "doc") {
          editor?.commands.setContent(content)
          
          // Add content highlight for remote user
          setTimeout(() => {
            addContentHighlight(remoteUserId, operation.payload?.html || "")
          }, 100)
        }
      }
    }

    window.addEventListener("document-update", handleDocumentUpdate as EventListener)
    return () => {
      window.removeEventListener("document-update", handleDocumentUpdate as EventListener)
    }
  }, [editor, userId])

  const addContentHighlight = (userId: string, content: string) => {
    const colors = [
      "#FEF3C7", "#DBEAFE", "#D1FAE5", "#EDE9FE", "#FCE7F3",
      "#FED7AA", "#C7D2FE", "#A7F3D0", "#FBCFE8", "#E0E7FF"
    ]
    
    const color = colors[Math.abs(userId.charCodeAt(0)) % colors.length]
    
    // Get editor position
    const editorElement = editor?.editorElement
    if (!editorElement) return
    
    const rect = editorElement.getBoundingClientRect()
    
    const highlight: ContentHighlight = {
      id: `${userId}-${Date.now()}`,
      userId,
      userName: userId === userId ? "You" : "User", // This should be the actual user name
      content: content.substring(0, 50), // Show first 50 characters
      position: {
        top: rect.top + 20,
        left: rect.left + 20,
      },
      color,
    }
    
    setContentHighlights(prev => [...prev.slice(-9), highlight]) // Keep last 10 highlights
    
    // Remove highlight after 5 seconds
    setTimeout(() => {
      setContentHighlights(prev => prev.filter(h => h.id !== highlight.id))
    }, 5000)
  }

  return (
    <div className="flex flex-col h-full">
      {!readOnly && <EditorToolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto relative" ref={editorContainerRef}>
        <EditorContent editor={editor} />
        
        {/* Connection status indicator */}
        {doc && userId && isConnected && (
          <div className="absolute top-2 right-2 flex items-center gap-2 z-50">
            <div className={`flex items-center gap-1 text-xs ${
              isConnected ? 'text-green-600' : 'text-yellow-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span>{isConnected ? 'Live' : 'Connecting...'}</span>
              <span className="font-medium">{contentHighlights.length}</span>
            </div>
          </div>
        )}
        
        {/* Content highlights */}
        {contentHighlights.map((highlight) => (
          <div
            key={highlight.id}
            className="absolute group pointer-events-none z-40"
            style={{
              top: highlight.position.top,
              left: highlight.position.left,
            }}
          >
            {/* Subtle highlight background */}
            <div
              className="w-2 h-2 rounded-full opacity-30 group-hover:opacity-60 transition-opacity"
              style={{ backgroundColor: highlight.color }}
            />
            
            {/* Tooltip on hover */}
            <div className="absolute top-full left-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-w-[200px] border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: highlight.color }}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {highlight.userName}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {highlight.content}
              </p>
              <div className="text-xs text-gray-400 mt-1">
                Just now
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}