import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { aiRequestSchema } from "@/validation/schemas"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    )
  }

  const body = await request.json()
  const parsed = aiRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_FAILED", message: parsed.error.issues[0].message } },
      { status: 422 }
    )
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "AI not configured" } },
      { status: 500 }
    )
  }

  const prompts: Record<string, string> = {
    SUMMARIZE: "Summarize the following document concisively:\n\n",
    REWRITE: "Rewrite the following document to improve clarity and flow:\n\n",
    TITLE: "Generate a concise title for the following document:\n\n",
    EXPLAIN: "Explain the following text in simple terms:\n\n",
    CONTINUE: "Continue writing the following document in the same style:\n\n",
  }

  const prompt = prompts[parsed.data.action]
  const text = parsed.data.selection || parsed.data.document

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const result = await model.generateContent(prompt + text)
    const response = result.response.text()

    return NextResponse.json({ success: true, data: { result: response } })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "AI request failed" } },
      { status: 500 }
    )
  }
}
