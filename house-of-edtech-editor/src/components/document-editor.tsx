"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCursor from "@tiptap/extension-collaboration-cursor"
import { useEffect, useRef, useState } from "react"
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
  History
} from "lucide-react"
import { Header } from "./header"

interface DocumentEditorProps {
  documentId: string
  documentTitle: string
  onTitleChange: (title: string) => void
  onShowUsers?: () => void
  onShowHistory?: () => void
}

export function DocumentEditor({ 
  documentId, 
  documentTitle, 
  onTitleChange,
  onShowUsers,
  onShowHistory
}: DocumentEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [collaborators, setCollaborators] = useState<Array<{
    id: string
    name: string
    color: string
    cursor: { top: number; left: number }
  }>>([])
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing your document...",
      }),
      Collaboration.configure({
        document: documentId,
      }),
      CollaborationCursor.configure({
        provider: null, // Will be set up with WebSocket
      }),
    ],
    content: "",
    autofocus: "end",
  })

  const handleAutoSave = () => {
    if (!editor) return
    
    const content = editor.getHTML()
    // In a real app, this would save to the database
    console.log("Auto-saving content:", content)
    setIsSaving(true)
    
    // Simulate save delay
    setTimeout(() => {
      setIsSaving(false)
      setLastSaved(new Date())
    }, 1000)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    onTitleChange(newTitle)
  }

  useEffect(() => {
    if (!editor) return

    // Auto-save on content change
    const editorListener = editor.on("update", handleAutoSave)
    
    return () => {
      editorListener()
    }
  }, [editor])

  const MenuBar = () => {
    if (!editor) return null

    return (
      <div className="flex items-center gap-1 border-b p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-gray-200" : ""}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-gray-200" : ""}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-gray-200" : ""}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-gray-200" : ""}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "bg-gray-200" : ""}
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
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowUsers}
        >
          <Users className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowHistory}
        >
          <History className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAutoSave}
          disabled={isSaving}
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header 
        documentTitle={documentTitle}
        onNewDocument={() => console.log("New document")}
        onShowUsers={onShowUsers}
      />
      
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Title input */}
        <div className="border-b px-6 py-4">
          <Input
            value={documentTitle}
            onChange={handleTitleChange}
            className="text-xl font-semibold border-none px-0 focus-visible:ring-0"
            placeholder="Document title..."
          />
          {lastSaved && (
            <p className="text-sm text-gray-500 mt-1">
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        {/* Editor toolbar */}
        <MenuBar />
        
        {/* Editor content */}
        <div className="flex-1 overflow-auto">
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none p-6 focus:outline-none"
          />
          
          {/* Collaboration cursors */}
          {collaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="absolute pointer-events-none"
              style={{
                top: collaborator.cursor.top,
                left: collaborator.cursor.left,
              }}
            >
              <div
                className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-transparent border-b-blue-500"
                style={{ transform: "translateY(-100%)" }}
              />
              <div
                className="bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                style={{ transform: "translateY(-100%)" }}
              >
                {collaborator.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}