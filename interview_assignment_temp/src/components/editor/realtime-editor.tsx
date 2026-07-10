"use client"

import { useEffect, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import { EditorToolbar } from "./editor-toolbar"
import RealtimeCursors from "./realtime-cursors"
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
  
  const { sendOperation } = useRealtimeCollaboration(
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
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-6",
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
        {doc && userId && (
          <RealtimeCursors
            documentId={doc.id}
            userId={userId}
            userName={userName}
            editorContainerRef={editorContainerRef}
          />
        )}
      </div>
    </div>
  )
}