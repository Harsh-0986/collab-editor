"use client"

import type { Editor } from "@tiptap/react"
import {
  Bold, Italic, Underline, Strikethrough, Code, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, Undo, Redo,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface EditorToolbarProps {
  editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  const tools = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), label: "Bold" },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), label: "Italic" },
    { icon: Underline, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), label: "Underline" },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), label: "Strikethrough" },
    { icon: Code, action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), label: "Code" },
  ]

  const blocks = [
    { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }), label: "Heading 1" },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), label: "Heading 2" },
    { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }), label: "Heading 3" },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), label: "Bullet List" },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), label: "Ordered List" },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), label: "Quote" },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <Button
            key={tool.label}
            variant={tool.active ? "secondary" : "ghost"}
            size="icon"
            onClick={tool.action}
            title={tool.label}
            className="h-8 w-8"
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <div className="flex items-center gap-1">
        {blocks.map((tool) => (
          <Button
            key={tool.label}
            variant={tool.active ? "secondary" : "ghost"}
            size="icon"
            onClick={tool.action}
            title={tool.label}
            className="h-8 w-8"
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} title="Undo" className="h-8 w-8">
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} title="Redo" className="h-8 w-8">
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
