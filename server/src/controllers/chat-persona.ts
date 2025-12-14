import { openai } from "@ai-sdk/openai";
import { stepCountIs, streamText, type ModelMessage } from "ai";
import type { Context } from "hono";
import { z } from "zod";
import { PERSONA_PROMPT } from "../agents/persona";
import { buildEssentialConversationMessages } from "../lib/ai-messages";
import { resolveUserFromRequest } from "../lib/auth/resolve-user";
import {
  buildUserContent,
  ChatMessageSchema,
  parseDbMessageContent,
} from "../lib/chat/message";
import { toIso } from "../lib/time";
import type { AppEnvWithAuth } from "../middleware/auth";
import {
  getChatSession,
  insertChatMessage,
  insertChatSession,
  listChatMessages,
} from "../repositories/chat";
import {
  getLatestUserPersonality,
  getUserPersonalityById,
} from "../repositories/personality";

const PersonaChatPayloadSchema = z.object({
  session_id: z.string().min(1),
  message: ChatMessageSchema,
});

/**
 * Crea una sessione chat per parlare con la "persona" dell'utente.
 *
 * Autenticazione:
 * - Clerk: Authorization: Bearer <jwt>
 * - oppure API Key: x-user-api-key: <opk_...>
 */
export async function PersonaChatSession(context: Context<AppEnvWithAuth>) {
  const resolved = resolveUserFromRequest(context);
  if (!resolved) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const db = context.get("db");
  const personality = getLatestUserPersonality(db, resolved.userId);

  if (!personality) {
    return context.json({ error: "Personality not found" }, 404);
  }

  const sessionId = crypto.randomUUID();
  const now = Date.now();

  insertChatSession(db, {
    id: sessionId,
    userId: resolved.userId,
    kind: "persona_chat",
    personalityId: personality.id,
    createdAt: now,
  });

  return context.json(
    {
      session_id: sessionId,
      personality: {
        id: personality.id,
        version: personality.version,
        updatedAt: toIso(personality.updated_at),
      },
    },
    201,
  );
}

/**
 * Chat con la persona dell'utente.
 *
 * Body:
 * - session_id: string (ottenuto da PersonaChatSession)
 * - message: { content?: string, parts?: [...] }
 *
 * Risposta: stream (UI Message Stream) compatibile con AI SDK.
 */
export async function PersonaChat(context: Context<AppEnvWithAuth>) {
  const resolved = resolveUserFromRequest(context);
  if (!resolved) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const body = await context.req.json().catch(() => null);
  const parsed = PersonaChatPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return context.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      400,
    );
  }

  const { session_id, message } = parsed.data;
  const db = context.get("db");

  const session = getChatSession(db, session_id);

  if (!session) {
    return context.json({ error: "Session not found" }, 404);
  }

  if (session.user_id !== resolved.userId) {
    return context.json({ error: "Forbidden" }, 403);
  }

  if (session.kind !== "persona_chat") {
    return context.json({ error: "Invalid session kind" }, 400);
  }

  if (!session.personality_id) {
    return context.json({ error: "Session has no personality" }, 409);
  }

  const personality = getUserPersonalityById(db, {
    personalityId: session.personality_id,
    userId: resolved.userId,
  });

  if (!personality) {
    return context.json({ error: "Personality not found" }, 404);
  }

  const historyRows = listChatMessages(db, session_id);
  const history: ModelMessage[] = historyRows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      role: r.role as "user" | "assistant",
      content: parseDbMessageContent(r.content) as any,
    }));

  const userContent = buildUserContent(message);
  if (!userContent) {
    return context.json({ error: "Empty message" }, 400);
  }

  const userMessage: ModelMessage = {
    role: "user",
    content: userContent,
  };
  const messagesForModel = buildEssentialConversationMessages({
    history,
    incoming: [userMessage],
  });

  const userMessageId = crypto.randomUUID();
  insertChatMessage(db, {
    id: userMessageId,
    sessionId: session_id,
    role: "user",
    content: userMessage.content,
    createdAt: Date.now(),
  });

  const assistantMessageId = crypto.randomUUID();
  const createdAt = Date.now();

  const result = streamText({
    model: openai("gpt-5.1-chat-latest"),
    system: PERSONA_PROMPT(personality.content_md),
    messages: messagesForModel,
    stopWhen: stepCountIs(5),
    abortSignal: context.req.raw.signal,
    onFinish: async (event) => {
      const trimmed = event.text.trim();
      if (!trimmed) return;

      insertChatMessage(db, {
        id: assistantMessageId,
        sessionId: session_id,
        role: "assistant",
        content: trimmed,
        createdAt,
      });
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: false,
    generateMessageId: () => assistantMessageId,
    messageMetadata: ({ part }) => {
      if (part.type !== "start" && part.type !== "finish") return undefined;
      return {
        session_id,
        user_message_id: userMessageId,
        assistant_message_id: assistantMessageId,
        personality_id: personality.id,
        personality_version: personality.version,
      };
    },
  });
}
