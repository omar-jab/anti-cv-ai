import { z } from "zod";
import type { FilePart, ImagePart, TextPart } from "ai";

export const ChatMessageSchema = z
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
  });

export type IncomingChatMessage = z.infer<typeof ChatMessageSchema>;

export function parseDbMessageContent(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export function buildUserContent(
  message: IncomingChatMessage,
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
