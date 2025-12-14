import {
  pruneMessages,
  type FilePart,
  type ImagePart,
  type ModelMessage,
  type TextPart,
} from "ai";

type KeptPart = TextPart | ImagePart | FilePart;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeParts(parts: unknown[]) {
  const normalized: KeptPart[] = [];
  let bufferedText = "";

  const flushText = () => {
    const text = bufferedText.trim();
    if (text) normalized.push({ type: "text", text });
    bufferedText = "";
  };

  for (const part of parts) {
    if (
      isRecord(part) &&
      part.type === "text" &&
      typeof part.text === "string"
    ) {
      bufferedText += bufferedText ? `\n${part.text}` : part.text;
      continue;
    }

    if (!isRecord(part)) continue;

    if (part.type === "image") {
      flushText();
      const image = part.image as ImagePart["image"];
      const mediaType =
        typeof part.mediaType === "string" ? part.mediaType : undefined;
      normalized.push({ type: "image", image, mediaType });
      continue;
    }

    if (part.type === "file") {
      flushText();
      if (typeof part.mediaType !== "string") continue;

      const data = part.data as FilePart["data"];
      const filename =
        typeof part.filename === "string" ? part.filename : undefined;
      normalized.push({
        type: "file",
        data,
        mediaType: part.mediaType,
        filename,
      });
      continue;
    }
  }

  flushText();
  return normalized;
}

function normalizeMessageContent(message: ModelMessage): ModelMessage | null {
  if (message.role === "tool") return null;

  if (message.role === "system") {
    return { role: "system", content: message.content };
  }

  const content = message.content;
  if (typeof content === "string") {
    const text = content.trim();
    return text ? { role: message.role, content: text } : null;
  }

  const parts = normalizeParts(content);
  if (parts.length === 0) return null;
  if (parts.length === 1 && parts[0].type === "text") {
    return { role: message.role, content: parts[0].text };
  }

  return { role: message.role, content: parts };
}

/**
 * Unisce lo storico (DB) con i nuovi messaggi e rimuove tutto ciò che non è
 * essenziale per la conversazione (es. reasoning, tool calls/results, metadata).
 *
 * Obiettivo: avere un array di `ModelMessage` più pulito e meno costoso in token
 * da passare a `generateText/streamText`.
 *
 * Nota: i messaggi in output includono SEMPRE `history + incoming` (in ordine),
 * ma con contenuti normalizzati e parti inutili eliminate.
 */
export function buildEssentialConversationMessages(options: {
  history: ModelMessage[];
  incoming: ModelMessage[];
}): ModelMessage[] {
  const merged = [...options.history, ...options.incoming];

  const pruned = pruneMessages({
    messages: merged,
    reasoning: "all",
    toolCalls: "all",
    emptyMessages: "remove",
  });

  const cleaned: ModelMessage[] = [];
  for (const message of pruned) {
    const normalized = normalizeMessageContent(message);
    if (normalized) cleaned.push(normalized);
  }

  return cleaned;
}
