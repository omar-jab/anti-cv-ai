type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function extractErrorMessage(json: unknown) {
  if (!isRecord(json)) return null;

  const direct =
    getOptionalString(json.detail) ??
    getOptionalString(json.message) ??
    getOptionalString(json.error);
  if (direct) return direct;

  const error = isRecord(json.error) ? json.error : null;
  if (!error) return null;

  return (
    getOptionalString(error.detail) ??
    getOptionalString(error.message) ??
    getOptionalString(error.error)
  );
}

export function getElevenLabsApiKey() {
  const apiKey = Bun.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing ELEVENLABS_API_KEY");
  }

  return apiKey;
}

export async function listElevenLabsVoices(params: {
  apiKey: string;
  signal?: AbortSignal;
}) {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: {
      Accept: "application/json",
      "xi-api-key": params.apiKey,
    },
    signal: params.signal,
  });

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(
      extractErrorMessage(json) ?? `ElevenLabs list voices failed (${res.status})`,
    );
  }

  if (!isRecord(json)) {
    throw new Error("ElevenLabs list voices: invalid JSON response");
  }

  const voices = Array.isArray(json.voices) ? json.voices : null;
  if (!voices) {
    throw new Error("ElevenLabs list voices: missing voices");
  }

  const mapped = voices
    .map((voice) => {
      if (!isRecord(voice)) return null;
      const voiceId = getOptionalString(voice.voice_id);
      const name = getOptionalString(voice.name);
      if (!voiceId || !name) return null;
      return { voiceId, name };
    })
    .filter((v): v is NonNullable<typeof v> => !!v);

  return { voices: mapped };
}

export type ElevenLabsVoiceSettings = {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
};

export async function streamElevenLabsTextToSpeech(params: {
  apiKey: string;
  voiceId: string;
  text: string;
  modelId?: string;
  outputFormat?: string;
  voiceSettings?: ElevenLabsVoiceSettings;
  signal?: AbortSignal;
}) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    params.voiceId,
  )}/stream`;

  const body: Record<string, unknown> = {
    text: params.text,
  };

  if (params.modelId) body.model_id = params.modelId;
  if (params.outputFormat) body.output_format = params.outputFormat;
  if (params.voiceSettings) body.voice_settings = params.voiceSettings;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": params.apiKey,
    },
    body: JSON.stringify(body),
    signal: params.signal,
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as unknown;
    throw new Error(
      extractErrorMessage(json) ??
        `ElevenLabs text-to-speech failed (${res.status})`,
    );
  }

  return res;
}
