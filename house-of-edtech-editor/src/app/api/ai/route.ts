import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId, action, content } = await request.json()

    // Get document to check permissions
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check if user has edit permissions
    const canEdit = document.ownerId === session.user.id ||
      document.members.some(member => 
        member.userId === session.user.id && 
        ["OWNER", "EDITOR"].includes(member.role)
      )

    if (!canEdit) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Mock AI processing - in a real app, this would call Google Gemini API
    let enhancedContent = content
    let suggestions = []

    switch (action) {
      case "grammar":
        enhancedContent = content.replace(/(\b\w+\b)/g, (match) => {
          // Simple grammar check mock
          if (match.length > 10) {
            return match.charAt(0).toUpperCase() + match.slice(1)
          }
          return match
        })
        suggestions = ["Consider using more concise language", "Check for punctuation errors"]
        break

      case "structure":
        enhancedContent = `<h1>Enhanced Document</h1><p>${content}</p><h2>Summary</h2><p>This document has been enhanced with better structure.</p>`
        suggestions = ["Add headings and subheadings", "Use bullet points for lists"]
        break

      case "style":
        enhancedContent = `<p style="font-family: Arial, sans-serif; line-height: 1.6;">${content}</p>`
        suggestions = ["Improve readability with better formatting", "Use consistent styling"]
        break

      case "summarize":
        const words = content.split(" ")
        const summary = words.slice(0, 50).join(" ") + (words.length > 50 ? "..." : "")
        enhancedContent = `<h2>Summary</h2><p>${summary}</p><h2>Original Content</h2><p>${content}</p>`
        suggestions = ["Consider key points", "Remove unnecessary details"]
        break

      default:
        enhancedContent = content
        suggestions = ["No specific action taken"]
    }

    // Create operation for the AI enhancement
    const operation = await prisma.operation.create({
      data: {
        documentId,
        version: document.version + 1,
        type: "AI_ENHANCEMENT",
        data: {
          action,
          suggestions,
          originalContent: content,
          enhancedContent,
        },
        createdBy: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      enhancedContent,
      suggestions,
      operation,
    })
  } catch (error) {
    console.error("Error processing AI request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}