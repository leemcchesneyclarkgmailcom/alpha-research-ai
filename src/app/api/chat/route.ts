import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { getCurrentUserOrDemo } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";

let zaiClient: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getClient() {
  if (zaiClient) return zaiClient;
  zaiClient = await ZAI.create();
  return zaiClient;
}

/**
 * AI Chat Analyst — conversational Q&A about a company.
 *
 * POST /api/chat
 * Body: { companyId: string, message: string, conversationId?: string }
 * Returns: { conversationId, message, history }
 */

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    companyId?: string;
    message?: string;
    conversationId?: string;
  };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const user = await getCurrentUserOrDemo(req);

  // Get company context
  const company = body.companyId
    ? await db.company.findUnique({ where: { id: body.companyId } })
    : null;

  // Get or create conversation
  let conversation;
  if (body.conversationId) {
    conversation = await db.chatConversation.findUnique({
      where: { id: body.conversationId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
    });
  }
  if (!conversation && user) {
    conversation = await db.chatConversation.create({
      data: {
        userId: user.id,
        companyId: body.companyId ?? null,
        title: body.message.slice(0, 60),
      },
      include: { messages: true },
    });
  }
  if (!conversation) {
    return NextResponse.json({ error: "could not create conversation" }, { status: 500 });
  }

  // Save user message
  await db.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: body.message,
    },
  });

  // Build context for the AI
  const companyContext = company
    ? `You are an expert equity analyst. The user is asking about ${company.name} (${company.ticker}).
Sector: ${company.sector ?? "n/a"}, Industry: ${company.industry ?? "n/a"}.
Market cap: ${company.marketCap ?? "n/a"}, P/E: ${company.peRatio ?? "n/a"}, EPS: ${company.eps ?? "n/a"}.
Description: ${company.description ?? "n/a"}.

Answer questions about this company with institutional-grade depth. Cite specific
metrics when relevant. If the user asks about something you don't know, say so.`
    : `You are an expert equity analyst. Answer the user's question about
stocks, markets, and investing with institutional-grade depth. Cite specific
metrics when relevant.`;

  // Build message history for the LLM
  const history = conversation.messages.slice(-10).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  try {
    const zai = await getClient();
    const resp = await zai.chat.completions.create({
      messages: [
        { role: "system", content: companyContext },
        ...history,
        { role: "user", content: body.message },
      ],
      temperature: 0.4,
      max_tokens: 800,
    });

    const reply = resp.choices[0]?.message?.content ?? "I apologize, I couldn't generate a response.";

    // Save assistant message
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: reply,
      },
    });

    // Charge a credit if user is authenticated
    if (session?.user?.id) {
      await db.user.update({
        where: { id: session.user.id },
        data: { creditsUsed: { increment: 1 } },
      });
    }

    return NextResponse.json({
      conversationId: conversation.id,
      message: reply,
      history: [...history, { role: "user", content: body.message }, { role: "assistant", content: reply }],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI request failed" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }
  const conversation = await db.chatConversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    conversation: {
      ...conversation,
      messages: conversation.messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    },
  });
}
