"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useRef, useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Save,
  Users,
  History,
} from "lucide-react"
import { Header } from "./header"
import { HistoryDialog } from "./history-dialog"
import { InviteDialog } from "./invite-dialog"
import { useLocalDocument, useSyncStatus } from "@/hooks/use-local-document"

interface DocumentEditorProps {
  documentId: string
}

export function DocumentEditor({ documentId }: DocumentEditorProps) {
  const { doc, loading, updateTitle, updateContent, saveSnapshot, pendingOps } =
    useLocalDocument(documentId)
  const syncStatus = useSyncStatus()
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [localTitle, setLocalTitle] = useState("")
  const [historyOpen, setHistoryOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const lastContentRef = useRef("")
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleInitRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing your document...",
      }),
    ],
    content: "",
    autofocus: "end",
    immediatelyRender: false,
  })

  useEffect(() => {
    if (doc && !titleInitRef.current) {
      setLocalTitle(doc.title)
      titleInitRef.current = true
    }
  }, [doc?.title])

  useEffect(() => {
    if (editor && doc && doc.content !== lastContentRef.current) {
      lastContentRef.current = doc.content
      if (editor.getHTML() !== doc.content) {
        editor.commands.setContent(doc.content, false)
      }
    }
  }, [doc?.content, editor])

  const handleEditorUpdate = useCallback(() => {
    if (!editor || !doc) return
    const html = editor.getHTML()
    if (html === lastContentRef.current) return

    lastContentRef.current = html

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      updateContent(html)
    }, 300)
  }, [editor, doc, updateContent])

  useEffect(() => {
    if (!editor) return
    editor.on("update", handleEditorUpdate)
    return () => {
      editor.off("update", handleEditorUpdate)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [editor, handleEditorUpdate])

  const handleSave = async () => {
    setIsSaving(true)
    await saveSnapshot()
    setLastSaved(new Date())
    setIsSaving(false)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTitle(e.target.value)
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
    titleTimeoutRef.current = setTimeout(() => {
      updateTitle(e.target.value)
    }, 500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-gray-200 rounded" />
            <div className="h-4 w-96 bg-gray-200 rounded" />
            <div className="h-4 w-80 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  const MenuBar = () => {
    if (!editor) return null

    return (
      <div className="flex items-center gap-1 border-b p-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-active={editor.isActive("bold")}
          className="data-[active=true]:bg-gray-200"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-active={editor.isActive("italic")}
          className="data-[active=true]:bg-gray-200"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-active={editor.isActive("bulletList")}
          className="data-[active=true]:bg-gray-200"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-active={editor.isActive("orderedList")}
          className="data-[active=true]:bg-gray-200"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-active={editor.isActive("blockquote")}
          className="data-[active=true]:bg-gray-200"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div
            className={`h-2 w-2 rounded-full ${
              syncStatus === "syncing"
                ? "bg-blue-500 animate-pulse"
                : syncStatus === "offline"
                  ? "bg-yellow-500"
                  : syncStatus === "error"
                    ? "bg-red-500"
                    : "bg-green-500"
            }`}
          />
          <span>
            {syncStatus === "syncing"
              ? "Syncing..."
              : syncStatus === "offline"
                ? "Offline"
                : syncStatus === "error"
                  ? "Sync error"
                  : "Saved"}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header documentTitle={doc?.title} />

      <div className="flex flex-col flex-1">
        <div className="border-b px-6 py-4">
          <Input
            value={localTitle}
            onChange={handleTitleChange}
            className="text-xl font-semibold border-none px-0 focus-visible:ring-0"
            placeholder="Document title..."
          />
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
            {lastSaved && <span>Last saved: {lastSaved.toLocaleTimeString()}</span>}
            {pendingOps > 0 && <span>{pendingOps} pending change{pendingOps !== 1 ? "s" : ""}</span>}
          </div>
        </div>

        <MenuBar />

        <div className="flex-1 overflow-auto">
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none p-6 focus:outline-none min-h-[60vh]"
          />
        </div>

        <div className="border-t px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Users
            </Button>
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
          <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Snapshot"}
          </Button>
        </div>
      </div>

      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} documentId={documentId} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} documentId={documentId} />
    </div>
  )
}