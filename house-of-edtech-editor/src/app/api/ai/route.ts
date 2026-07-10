import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

const MAX_CONTENT_LENGTH = 50000

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>
    }
  }>
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY not configured")
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} ${errorText}`)
  }

  const data: GeminiResponse = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId, action, content } = await request.json()

    if (!documentId || !action || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: "Content exceeds maximum length" }, { status: 413 })
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        members: { where: { userId: session.user.id } },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const canEdit = document.ownerId === session.user.id ||
      document.members.some((m: { userId: string; role: string }) =>
        m.userId === session.user.id && ["OWNER", "EDITOR"].includes(m.role)
      )

    if (!canEdit) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const plainText = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

    let systemPrompt: string
    switch (action) {
      case "grammar":
        systemPrompt = `You are a professional editor. Fix grammar, spelling, and punctuation in the following text. Preserve the original meaning and structure. Return only the corrected text:\n\n${plainText}`
        break
      case "summarize":
        systemPrompt = `Summarize the following text concisively while preserving key points:\n\n${plainText}`
        break
      case "enhance":
        systemPrompt = `Improve the clarity and professionalism of the following text. Fix awkward phrasing and improve flow:\n\n${plainText}`
        break
      case "translate":
        systemPrompt = `Translate the following text to English:\n\n${plainText}`
        break
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    let result: string
    try {
      result = await callGemini(systemPrompt)
    } catch (err) {
      if (err instanceof Error && err.message.includes("not configured")) {
        return NextResponse.json({
          enhancedContent: content,
          suggestions: ["AI is not configured. Set GOOGLE_AI_API_KEY to enable AI features."],
        })
      }
      throw err
    }

    await prisma.operation.create({
      data: {
        documentId,
        version: document.version + 1,
        type: "AI_ENHANCEMENT",
        data: { action, originalContent: content, enhancedContent: result },
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({
      enhancedContent: result,
      suggestions: [`${action} applied successfully`],
    })
  } catch (error) {
    return NextResponse.json({
      enhancedContent: null,
      suggestions: ["AI processing failed. Please try again."],
    })
  }
}