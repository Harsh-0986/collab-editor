"use client"

import { useEffect, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import { EditorToolbar } from "./editor-toolbar"
import { CursorOverlay } from "./cursor-overlay"
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

export function DocumentEditor({ 
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

  useEffect(() => {
    lamportRef.current = currentLamport
  }, [currentLamport])

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
      console.log("[editor] content changed:", { 
        html: html.substring(0, 50), 
        json: JSON.stringify(json).substring(0, 100) 
      })
      onContentChange?.(json)

      if (onOperation && !readOnly) {
        const newLamport = lamportRef.current + 1
        onOperation("INSERT", { content: json, html }, newLamport)
      }
    },
  })

  useEffect(() => {
    if (editor && doc?.content) {
      const currentJson = JSON.stringify(editor.getJSON())
      const newJson = JSON.stringify(doc.content)
      console.log("[editor] content update check:", {
        current: currentJson.substring(0, 100),
        new: newJson.substring(0, 100),
        same: currentJson === newJson,
        hasDoc: !!doc,
        hasContent: !!doc?.content
      })
      if (currentJson !== newJson && doc.content.type === "doc") {
        editor.commands.setContent(doc.content)
      }
    }
  }, [doc?.id, doc?.content, editor])

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [editor, readOnly])

  useEffect(() => {
    return () => editor?.destroy()
  }, [editor])

  return (
    <div className="flex flex-col h-full">
      {!readOnly && <EditorToolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto relative" ref={editorContainerRef}>
        <EditorContent editor={editor} />
        {userId && doc && (
          <CursorOverlay
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
