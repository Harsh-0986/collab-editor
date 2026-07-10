"use client"

import { useEffect, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
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

// Custom extension for remote cursors
const RemoteCursorExtension = {
  addProseMirrorPlugins() {
    return [
      () => ({
        appendTransaction: (transactions, oldState, newState) => {
          // This would handle cursor positioning within the editor content
          return null
        }
      })
    ]
  }
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
  
  const { cursors: remoteCursors, isConnected, sendCursorPosition, sendOperation } = useRealtimeCollaboration(
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
      RemoteCursorExtension,
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
        }
      }
    }

    window.addEventListener("document-update", handleDocumentUpdate as EventListener)
    return () => {
      window.removeEventListener("document-update", handleDocumentUpdate as EventListener)
    }
  }, [editor, userId])

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
              <span className="font-medium">{Object.keys(remoteCursors).length}</span>
            </div>
          </div>
        )}
        
        {/* Remote cursors as actual text cursors */}
        {doc && userId && isConnected && (
          <div className="absolute inset-0 pointer-events-none">
            {Object.values(remoteCursors).map((cursor) => (
              <div
                key={cursor.userId}
                className="absolute pointer-events-none"
                style={{
                  left: cursor.position.x,
                  top: cursor.position.y,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Real text cursor style */}
                <div 
                  className="w-px h-5 bg-black animate-pulse"
                  style={{
                    boxShadow: `0 0 0 1px ${cursor.color}40`,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}