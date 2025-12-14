import type { Context } from "hono";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { AppEnvWithAuth } from "../middleware/auth";
import {
  getElevenLabsApiKey,
  listElevenLabsVoices,
  streamElevenLabsTextToSpeech,
  type ElevenLabsVoiceSettings,
} from "../lib/elevenlabs";

const VoiceSettingsSchema = z
  .object({
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
    useSpeakerBoost: z.boolean().optional(),
  })
  .strict();

const CreateTtsRequestSchema = z
  .object({
    text: z.string().trim().min(1).max(4000),
    voiceId: z.string().trim().min(1),
    modelId: z.string().trim().min(1).optional(),
    outputFormat: z.string().trim().min(1).optional(),
    voiceSettings: VoiceSettingsSchema.optional(),
  })
  .strict();

type TtsRequest = {
  id: string;
  userId: string;
  token: string;
  text: string;
  voiceId: string;
  modelId: string | null;
  outputFormat: string | null;
  voiceSettings: ElevenLabsVoiceSettings | null;
  expiresAt: number;
};

const TTS_REQUEST_TTL_MS = 2 * 60 * 1000;
const MAX_TTS_REQUESTS = 200;
const ttsRequests = new Map<string, TtsRequest>();

function cleanupExpiredRequests(now = Date.now()) {
  for (const [key, value] of ttsRequests.entries()) {
    if (value.expiresAt <= now) {
      ttsRequests.delete(key);
    }
  }
}

function mapVoiceSettings(
  input: z.infer<typeof VoiceSettingsSchema> | undefined,
): ElevenLabsVoiceSettings | null {
  if (!input) return null;

  const mapped: ElevenLabsVoiceSettings = {};
  if (typeof input.stability === "number") mapped.stability = input.stability;
  if (typeof input.similarityBoost === "number") {
    mapped.similarity_boost = input.similarityBoost;
  }
  if (typeof input.style === "number") mapped.style = input.style;
  if (typeof input.useSpeakerBoost === "boolean") {
    mapped.use_speaker_boost = input.useSpeakerBoost;
  }

  return Object.keys(mapped).length ? mapped : null;
}

export async function ListTtsVoices(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  let apiKey: string;
  try {
    apiKey = getElevenLabsApiKey();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return context.json(
      { error: "ElevenLabs is not configured", details: message },
      500,
    );
  }

  try {
    const result = await listElevenLabsVoices({
      apiKey,
      signal: context.req.raw.signal,
    });
    return context.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return context.json(
      { error: "Failed to list voices", details: message },
      500,
    );
  }
}

/**
 * Crea una "request" TTS effimera (in-memory) e restituisce un URL streamabile
 * via <audio src="..."> senza esporre l'API key di ElevenLabs.
 */
export async function CreateTtsRequest(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const body = await context.req.json().catch(() => null);
  const parsed = CreateTtsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return context.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      400,
    );
  }

  cleanupExpiredRequests();

  if (ttsRequests.size >= MAX_TTS_REQUESTS) {
    // fallback: rimuovi le più vecchie
    const sorted = [...ttsRequests.values()].sort(
      (a, b) => a.expiresAt - b.expiresAt,
    );
    for (const r of sorted.slice(0, Math.ceil(MAX_TTS_REQUESTS / 4))) {
      ttsRequests.delete(r.id);
    }
  }

  const id = crypto.randomUUID();
  const tokenHex = randomBytes(24).toString("hex");
  const expiresAt = Date.now() + TTS_REQUEST_TTL_MS;

  const voiceSettings = mapVoiceSettings(parsed.data.voiceSettings);

  ttsRequests.set(id, {
    id,
    userId,
    token: tokenHex,
    text: parsed.data.text,
    voiceId: parsed.data.voiceId,
    modelId: parsed.data.modelId ?? null,
    outputFormat: parsed.data.outputFormat ?? null,
    voiceSettings,
    expiresAt,
  });

  const streamUrl = `/api/tts/requests/${encodeURIComponent(
    id,
  )}/stream?token=${encodeURIComponent(tokenHex)}`;

  return context.json(
    {
      requestId: id,
      streamUrl,
      expiresAt: new Date(expiresAt).toISOString(),
    },
    201,
  );
}

export async function StreamTtsRequest(context: Context<AppEnvWithAuth>) {
  const id = context.req.param("id");
  const token = context.req.query("token")?.trim() ?? "";
  if (!id || !token) {
    return context.json({ error: "Invalid request" }, 400);
  }

  cleanupExpiredRequests();

  const request = ttsRequests.get(id);
  if (!request) {
    return context.json({ error: "Not found" }, 404);
  }

  if (request.token !== token) {
    return context.json({ error: "Forbidden" }, 403);
  }

  const now = Date.now();
  if (request.expiresAt <= now) {
    ttsRequests.delete(id);
    return context.json({ error: "Expired" }, 410);
  }

  // Se abbiamo userId (cookie Clerk o Authorization), rinforziamo la protezione.
  const currentUserId = context.get("userId");
  if (currentUserId && currentUserId !== request.userId) {
    return context.json({ error: "Forbidden" }, 403);
  }

  let apiKey: string;
  try {
    apiKey = getElevenLabsApiKey();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return context.json(
      { error: "ElevenLabs is not configured", details: message },
      500,
    );
  }

  try {
    const upstream = await streamElevenLabsTextToSpeech({
      apiKey,
      voiceId: request.voiceId,
      text: request.text,
      modelId: request.modelId ?? undefined,
      outputFormat: request.outputFormat ?? undefined,
      voiceSettings: request.voiceSettings ?? undefined,
      signal: context.req.raw.signal,
    });

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("Content-Type") ?? "audio/mpeg",
    );
    headers.set("Cache-Control", "no-store");

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return context.json(
      { error: "Failed to stream audio", details: message },
      500,
    );
  }
}
