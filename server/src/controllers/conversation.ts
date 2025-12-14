import type { Database } from "bun:sqlite";
import { openai } from "@ai-sdk/openai";
import { stepCountIs, streamText, type ModelMessage } from "ai";
import type { Context } from "hono";
import { z } from "zod";
import { buildEssentialConversationMessages } from "../lib/ai-messages";
import {
  buildUserContent,
  ChatMessageSchema,
  parseDbMessageContent,
} from "../lib/chat/message";
import { normalizeHandle } from "../lib/handle";
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

const ConversationSessionPayloadSchema = z.object({
  handle: z.string().min(1),
});

const ConversationPayloadSchema = z.object({
  handle: z.string().min(1),
  session_id: z.string().min(1),
  message: ChatMessageSchema,
});

function buildConversationSystemPrompt(
  personaMarkdown: string,
  handle: string,
) {
  const persona = personaMarkdown.trim();
  return `
Sei un assistente che deve **replicare** la persona descritta sotto.

Obiettivo:
- Rispondi come se fossi l'utente @${handle} in prima persona.

Regole:
- Non menzionare che stai usando un prompt o un documento interno.
- Mantieni tono, stile, valori e confini coerenti con la Persona.
- Se manca informazione, chiedi chiarimenti o rispondi in modo conservativo.
- Non inventare dati personali o fatti non presenti.

<persona_markdown>
${persona}
</persona_markdown>
`.trim();
}

function resolveUserIdFromHandle(db: Database, rawHandle: string) {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return null;

  const row = db
    .query("SELECT id FROM users WHERE handle = ? COLLATE NOCASE LIMIT 1")
    .get(handle) as { id: string } | undefined;

  if (!row?.id) return null;
  return { userId: row.id, handle };
}

/**
 * Crea una sessione "conversation" per chattare con la replica dell'utente.
 *
 * Identificazione:
 * - handle nel body (es. "@omar")
 *
 * Nota: endpoint pubblico (non richiede auth).
 */
export async function ConversationSession(context: Context<AppEnvWithAuth>) {
  const body = await context.req.json().catch(() => null);
  const parsed = ConversationSessionPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return context.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      400,
    );
  }

  const db = context.get("db");
  const resolved = resolveUserIdFromHandle(db, parsed.data.handle);
  if (!resolved) {
    return context.json({ error: "User not found" }, 404);
  }

  const personality = getLatestUserPersonality(db, resolved.userId);

  if (!personality) {
    return context.json({ error: "Personality not found" }, 404);
  }

  const sessionId = crypto.randomUUID();
  const now = Date.now();

  insertChatSession(db, {
    id: sessionId,
    userId: resolved.userId,
    kind: "conversation",
    personalityId: personality.id,
    createdAt: now,
  });

  return context.json(
    {
      session_id: sessionId,
      handle: resolved.handle,
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
 * Stream di conversazione con la replica dell'utente.
 *
 * Body:
 * - handle: string (es. "@omar")
 * - session_id: string (ottenuto da ConversationSession)
 * - message: { content?: string, parts?: [...] }
 *
 * Risposta: stream (UI Message Stream) compatibile con AI SDK.
 */
export async function Conversation(context: Context<AppEnvWithAuth>) {
  const body = await context.req.json().catch(() => null);
  const parsed = ConversationPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return context.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      400,
    );
  }

  const { handle: rawHandle, session_id, message } = parsed.data;
  const db = context.get("db");
  const resolved = resolveUserIdFromHandle(db, rawHandle);
  if (!resolved) {
    return context.json({ error: "User not found" }, 404);
  }

  const session = getChatSession(db, session_id);

  if (!session) {
    return context.json({ error: "Session not found" }, 404);
  }

  if (session.user_id !== resolved.userId) {
    return context.json({ error: "Forbidden" }, 403);
  }

  if (session.kind !== "conversation") {
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
    system: buildConversationSystemPrompt(
      personality.content_md,
      resolved.handle,
    ),
    messages: messagesForModel,
    stopWhen: stepCountIs(6),
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
        handle: resolved.handle,
        user_message_id: userMessageId,
        assistant_message_id: assistantMessageId,
        personality_id: personality.id,
        personality_version: personality.version,
      };
    },
  });
}
