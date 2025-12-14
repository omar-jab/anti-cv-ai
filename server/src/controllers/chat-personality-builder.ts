import { google } from "@ai-sdk/google";
import {
  stepCountIs,
  streamText,
  type FilePart,
  type ImagePart,
  type ModelMessage,
  type TextPart,
} from "ai";
import type { Context } from "hono";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { buildEssentialConversationMessages } from "../lib/ai-messages";
import type { AppEnvWithAuth } from "../middleware/auth";
import { createUpdateUserMemory } from "../tools/memory/update-user-memory";
import { openai } from "@ai-sdk/openai";

const PersonalityBuilderPayloadSchema = z.object({
  session_id: z.string().min(1),
  message: z
    .object({
      content: z.string().optional(),
      parts: z
        .array(
          z.union([
            z.object({ type: z.literal("text"), text: z.string() }),
            z.object({
              type: z.literal("file"),
              mediaType: z.string().min(1),
              filename: z.string().optional(),
              url: z.string().min(1),
            }),
            z.object({
              type: z.literal("file"),
              mediaType: z.string().min(1),
              filename: z.string().optional(),
              data: z.string().min(1),
            }),
            z.object({
              type: z.literal("image"),
              image: z.string().min(1),
              mediaType: z.string().optional(),
            }),
          ]),
        )
        .optional(),
    })
    .superRefine((value, ctx) => {
      const hasText = typeof value.content === "string" && value.content.trim();
      const hasParts = Array.isArray(value.parts) && value.parts.length > 0;
      if (!hasText && !hasParts) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "message.content or message.parts is required",
        });
      }
    }),
});

export const PERSONALITY_BUILDER_SYSTEM_PROMPT = `
RUOLO E TONO
Sei un Ghostwriter empatico e tecnicamente competente. Il tuo lavoro è chiacchierare con l'utente per estrarre le sue storie professionali migliori (il suo "Anti-Portfolio").
Il tuo stile è quello di un **collega curioso davanti a un caffè**: informale ma professionale, caldo, mai giudicante.
NON sei un modulo da compilare. NON sei un interrogatore della polizia.
Il tuo superpotere è l'ascolto attivo: ti agganci a un dettaglio che l'utente ha appena detto per portarlo naturalmente verso il tema successivo.

OBIETTIVO
Costruire un profilo autentico (metodo, errori, decisioni, prove) senza che l'utente senta la fatica di "scrivere il CV".

REGOLA D'ORO: FLUIDITÀ E "PONTI"
Non fare mai una domanda a freddo. Usa sempre la tecnica del "Ponte":
1. **Riconoscimento:** Breve reazione a ciò che l'utente ha appena detto (es: "Capisco, situazione stressante...", "Ah, ottima intuizione...", "Immagino sia stato difficile...").
2. **Gancio:** Collega quella reazione alla prossima domanda.
3. **Domanda:** Una sola, aperta e stimolante.

Esempio SI: "Interessante che tu abbia scelto Rust per questo. Ma come hai gestito la curva di apprendimento del team mentre le scadenze premevano?"
Esempio NO: "Quali difficoltà hai incontrato con il team?"

GESTIONE DELL'INTERESSE (ANTI-NOIA)
- **Leggi la stanza:** Se l'utente risponde a monosillabi ("sì", "boh", "normale"), **MOLLA L'OSSO**. Non insistere. Cambia radicalmente argomento (dal tecnico al relazionale, o viceversa).
- **Niente tunnel:** Non fare più di 2 domande di approfondimento sullo stesso micro-dettaglio. Se hai capito il concetto, passa avanti.
- **Varia il ritmo:** Alterna domande su fatti concreti (stack, tools) a domande su sensazioni e "soft skills" (conflitti, dubbi, soddisfazioni).

MEMORIA E DATI (INVISIBLE INTELLIGENCE)
L'utente non deve vedere che stai "schedando" i dati, ma tu devi farlo costantemente.
Leggi sempre <user_memories>. Dopo OGNI risposta utile, chiama \`updateMemory\`.

COSA CERCHI (senza chiederlo come una lista):
- Storie di "trincea" (bug critici, rilasci difficili).
- Come prende decisioni (data-driven? istinto? consenso?).
- Cosa ha imparato dai propri errori (lezione > successo).
- Prove concrete (link, repo, screenshot) -> Chiedile solo se il contesto è caldo e naturale.

SICUREZZA
- Non chiedere/salvare PII (dati personali sensibili).
- Se l'utente divaga su traumi personali, riportalo gentilmente sul piano lavorativo ("Capisco che sia stato dura a livello personale, ma sul lavoro come ha impattato le tue scelte successive?").

OPERATIVITÀ (LOOP DI PENSIERO)
Prima di rispondere:
1. Analizza l'input: L'utente è ingaggiato o annoiato? C'è un'informazione da salvare?
2. Esegui \`updateMemory\` se c'è sostanza (Decisioni, Stack, Lezioni, Progetti).
3. Formula la risposta:
   - Se l'utente era vago -> Fai una domanda a scelta multipla implicita ("Preferisci parlarmi di X o di Y?").
   - Se l'utente era specifico -> Usa il "Ponte" + Domanda di approfondimento.
   - Se hai abbastanza materiale su un tema -> Chiudi il punto con un complimento sincero e apri un nuovo capitolo.

FORMATO OUTPUT
- Massimo 2-3 frasi.
- Linguaggio naturale, niente "formalese".
- Mai elenchi puntati nelle tue domande. Sembrano compiti a casa.

CHECKPOINT (NATURALE)
Ogni tanto (ogni 5-6 turni), invece di fare una domanda nuova, fai un riassunto empatico:
"Aspetta, fammi vedere se ho capito bene il tuo approccio: tu tendi a fare X quando succede Y, giusto? Mi sembra un tratto distintivo."
Se conferma -> Salva/Consolida memoria.
`.trim();

type IncomingMessage = z.infer<
  typeof PersonalityBuilderPayloadSchema
>["message"];

function buildUserContent(
  message: IncomingMessage,
): string | Array<TextPart | ImagePart | FilePart> {
  const parts: Array<TextPart | ImagePart | FilePart> = [];

  const text = message.content?.trim();
  if (text) parts.push({ type: "text", text });

  for (const part of message.parts ?? []) {
    if (part.type === "text") {
      const t = part.text.trim();
      if (t) parts.push({ type: "text", text: t });
      continue;
    }

    if (part.type === "image") {
      parts.push({
        type: "image",
        image: part.image,
        mediaType: part.mediaType,
      });
      continue;
    }

    if (part.type === "file") {
      const payload = "data" in part ? part.data : part.url;
      if (part.mediaType.startsWith("image/")) {
        parts.push({
          type: "image",
          image: payload,
          mediaType: part.mediaType,
        });
      } else {
        parts.push({
          type: "file",
          data: payload,
          mediaType: part.mediaType,
          filename: part.filename,
        });
      }
    }
  }

  if (parts.length === 0) return "";
  if (parts.length === 1 && parts[0].type === "text") return parts[0].text;
  return parts;
}

function parseDbMessageContent(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function compactOneLine(input: string) {
  return input.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function buildUserMemoriesBlock(
  rows: Array<{ section: string; title: string; content: string }>,
) {
  const lines: string[] = [];

  for (const row of rows) {
    const title = compactOneLine(`${row.section}/${row.title}`);
    const content = compactOneLine(row.content);
    if (!title || !content) continue;
    lines.push(`${title}: ${content}`);
  }

  return `<user_memories>\n${lines.join("\n")}\n</user_memories>\n---`;
}

/**
 * Chat Personality Builder
 *
 * Chat Multiturno con l'agente che ti aiuta a creare la tua personalità online.
 * Richiede autenticazione: l'utente deve essere loggato con Clerk.
 */
export async function ChatPersonalityBuilder(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const body = await context.req.json().catch(() => null);
  const parsed = PersonalityBuilderPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return context.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      400,
    );
  }

  const { session_id, message } = parsed.data;
  const db = context.get("db");

  // Assicura che la sessione esista e sia collegata all'utente loggato
  const existingSession = db
    .query("SELECT user_id, kind FROM chat_sessions WHERE id = ?")
    .get(session_id) as
    | { user_id: string | null; kind: string | null }
    | undefined;

  if (!existingSession) {
    db.query(
      "INSERT INTO chat_sessions (id, user_id, kind, created_at) VALUES (?, ?, 'personality_builder', ?)",
    ).run(session_id, userId, Date.now());
  } else if (
    existingSession.kind &&
    existingSession.kind !== "personality_builder"
  ) {
    return context.json({ error: "Invalid session kind" }, 400);
  } else if (existingSession.user_id && existingSession.user_id !== userId) {
    return context.json({ error: "Forbidden" }, 403);
  } else if (!existingSession.user_id) {
    db.query("UPDATE chat_sessions SET user_id = ? WHERE id = ?").run(
      userId,
      session_id,
    );
  }

  const historyRows = db
    .query(
      "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC",
    )
    .all(session_id) as Array<{ role: string; content: string }>;

  const userMemories = db
    .query(
      `SELECT section, title, content
       FROM user_memory_items
       WHERE user_id = ?
       ORDER BY section ASC, title ASC, updated_at DESC`,
    )
    .all(userId) as Array<{ section: string; title: string; content: string }>;

  const systemWithMemories = `
    ${PERSONALITY_BUILDER_SYSTEM_PROMPT}
    ${buildUserMemoriesBlock(userMemories)}
  `;

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

  const userMessageId = uuidv4();
  db.query(
    "INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(
    userMessageId,
    session_id,
    "user",
    JSON.stringify(userMessage.content),
    Date.now(),
  );

  const assistantMessageId = uuidv4();
  const createdAt = Date.now();

  // Crea i memory tools per l'utente corrente
  const memoryTools = {
    updateMemory: createUpdateUserMemory(db, userId),
  };

  const result = streamText({
    // model: google("gemini-flash-latest"),
    model: openai("gpt-5.1-chat-latest"),
    system: systemWithMemories,
    messages: messagesForModel,
    tools: memoryTools,
    stopWhen: stepCountIs(5),
    abortSignal: context.req.raw.signal,
    onFinish: async (event) => {
      const trimmed = event.text.trim();
      if (!trimmed) return;

      db.query(
        "INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(
        assistantMessageId,
        session_id,
        "assistant",
        JSON.stringify(trimmed),
        createdAt,
      );
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
      };
    },
  });
}
