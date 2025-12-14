import {
    Conversation,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import ChatInput from "@/components/chat/chat-input";
import ChatMessages from "@/components/chat/chat-messages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@clerk/clerk-react";
import { useChat } from "@ai-sdk/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DefaultChatTransport, type ChatStatus, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { useStickToBottomContext } from "use-stick-to-bottom";

type ElevenLabsVoice = {
    voiceId: string;
    name: string;
};

type ChatRequestFilePart = {
    type: "file";
    mediaType: string;
    filename?: string;
    url: string;
};

import { getApiUrl } from "@/lib/api";

async function fetchElevenLabsVoices(getToken: () => Promise<string | null>) {
    const token = await getToken();
    const res = await fetch(getApiUrl("/api/tts/voices"), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Request failed (${res.status})`);
    }

    const data = (await res.json().catch(() => null)) as {
        voices?: unknown;
    } | null;
    const voicesRaw = data?.voices;
    if (!Array.isArray(voicesRaw)) {
        throw new Error("Invalid voices response");
    }

    const voices = voicesRaw
        .map((v) => {
            if (!v || typeof v !== "object") return null;
            const record = v as Record<string, unknown>;
            const voiceId =
                typeof record.voiceId === "string" ? record.voiceId : null;
            const name = typeof record.name === "string" ? record.name : null;
            if (!voiceId || !name) return null;
            return { voiceId, name } satisfies ElevenLabsVoice;
        })
        .filter((v): v is ElevenLabsVoice => !!v);

    return voices;
}

async function createTtsRequest(params: {
    getToken: () => Promise<string | null>;
    voiceId: string;
    text: string;
}) {
    const token = await params.getToken();
    const res = await fetch(getApiUrl("/api/tts/requests"), {
        method: "POST",
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : undefined),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ voiceId: params.voiceId, text: params.text }),
    });

    if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Request failed (${res.status})`);
    }

    const data = (await res.json().catch(() => null)) as {
        streamUrl?: unknown;
    } | null;
    const streamUrl = typeof data?.streamUrl === "string" ? data.streamUrl : null;
    if (!streamUrl) {
        throw new Error("Invalid TTS response");
    }

    return { streamUrl };
}

async function createPersonaSession(getToken: () => Promise<string | null>) {
    const token = await getToken();
    const res = await fetch(getApiUrl("/api/chat/persona/session"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Request failed (${res.status})`);
    }

    const data = (await res.json().catch(() => null)) as {
        session_id?: unknown;
        personality?: unknown;
    } | null;

    const sessionId =
        typeof data?.session_id === "string" && data.session_id
            ? data.session_id
            : null;
    if (!sessionId) {
        throw new Error("Invalid session response");
    }

    const personality = (() => {
        const p = data?.personality;
        if (!p || typeof p !== "object") return null;
        const record = p as Record<string, unknown>;
        const id = typeof record.id === "string" ? record.id : null;
        const version = typeof record.version === "number" ? record.version : null;
        const updatedAt =
            typeof record.updatedAt === "string" ? record.updatedAt : null;
        if (!id || typeof version !== "number") return null;
        return { id, version, updatedAt };
    })();

    return { sessionId, personality };
}

function uiMessageToChatPayload(message: UIMessage) {
    let content = "";
    const parts: ChatRequestFilePart[] = [];

    for (const part of message.parts) {
        if (part.type === "text") {
            content += content ? `\n${part.text}` : part.text;
            continue;
        }

        if (part.type === "file") {
            parts.push({
                type: "file",
                mediaType: part.mediaType,
                filename: part.filename,
                url: part.url,
            });
        }
    }

    const trimmed = content.trim();
    const payload: { content?: string; parts?: ChatRequestFilePart[] } = {};

    if (trimmed) payload.content = trimmed;
    if (parts.length) payload.parts = parts;

    return payload;
}

function extractMessageText(message: UIMessage) {
    const parts = message.parts.filter((p) => p.type === "text");
    const text = parts
        .map((p) => p.text)
        .join("")
        .trim();
    return text;
}

export default function ElevenLabsVoiceTester() {
    const { isLoaded, isSignedIn, getToken } = useAuth();

    const [authToken, setAuthToken] = useState<string | null>(null);
    const [tokenLoading, setTokenLoading] = useState(true);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [voiceId, setVoiceId] = useState<string>("");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const [personalityInfo, setPersonalityInfo] = useState<{
        id: string;
        version: number;
        updatedAt: string | null;
    } | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audioError, setAudioError] = useState<string | null>(null);
    const lastSpokenAssistantMessageIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isLoaded) return;

        if (isSignedIn) {
            setTokenLoading(true);
            getToken()
                .then((token) => setAuthToken(token))
                .finally(() => setTokenLoading(false));
        } else {
            setAuthToken(null);
            setTokenLoading(false);
        }
    }, [getToken, isLoaded, isSignedIn]);

    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    const voicesQuery = useQuery<ElevenLabsVoice[], Error>({
        queryKey: ["elevenlabs-voices"],
        enabled: isLoaded && isSignedIn,
        queryFn: () => fetchElevenLabsVoices(getToken),
    });

    useEffect(() => {
        if (voiceId) return;
        const first = voicesQuery.data?.[0]?.voiceId ?? "";
        if (first) setVoiceId(first);
    }, [voiceId, voicesQuery.data]);

    const createSessionMutation = useMutation({
        mutationFn: () => createPersonaSession(getToken),
    });

    const ensureSession = useCallback(async () => {
        const existing = sessionIdRef.current;
        if (existing) return existing;

        const created = await createSessionMutation.mutateAsync();
        setSessionId(created.sessionId);
        sessionIdRef.current = created.sessionId;
        setPersonalityInfo(created.personality);
        return created.sessionId;
    }, [createSessionMutation]);

    const [chatInstanceId] = useState(() => crypto.randomUUID());

    const transport = useMemo(() => {
        return new DefaultChatTransport({
            api: getApiUrl("/api/chat/persona"),
            headers: async () => {
                const token = authToken ?? (await getToken());
                if (!token) {
                    console.warn("[ElevenLabs] No token available for request");
                    return {};
                }
                return { Authorization: `Bearer ${token}` };
            },
            prepareSendMessagesRequest: ({ messages, messageId }) => {
                const sid = sessionIdRef.current;
                if (!sid) {
                    throw new Error("Session not initialized");
                }

                const message =
                    (messageId && messages.find((m) => m.id === messageId)) ??
                    messages.at(-1);
                if (!message) return { body: { session_id: sid } };

                return {
                    body: {
                        session_id: sid,
                        message: uiMessageToChatPayload(message),
                    },
                };
            },
        });
    }, [authToken, getToken]);

    const { messages, sendMessage, status, error, clearError } = useChat({
        id: chatInstanceId,
        transport,
    });

    const ttsMutation = useMutation({
        mutationFn: async (params: { text: string; voiceId: string }) =>
            createTtsRequest({
                getToken,
                text: params.text,
                voiceId: params.voiceId,
            }),
    });

    const stopAudio = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
    }, []);

    const speakText = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;
            if (!voiceId) {
                setAudioError("Seleziona una voice prima di parlare.");
                return;
            }

            setAudioError(null);
            stopAudio();

            const { streamUrl } = await ttsMutation.mutateAsync({
                text: trimmed,
                voiceId,
            });

            const audio = audioRef.current;
            if (!audio) return;
            audio.src = streamUrl;

            try {
                await audio.play();
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                setAudioError(
                    message ||
                    "Riproduzione bloccata dal browser. Premi play manualmente.",
                );
            }
        },
        [stopAudio, ttsMutation, voiceId],
    );

    useEffect(() => {
        if (!autoSpeak) return;
        if (status !== "ready") return;

        const lastAssistant = [...messages]
            .reverse()
            .find((m) => m.role === "assistant");
        if (!lastAssistant) return;
        if (lastAssistant.id === lastSpokenAssistantMessageIdRef.current) return;

        const text = extractMessageText(lastAssistant);
        if (!text) return;

        lastSpokenAssistantMessageIdRef.current = lastAssistant.id;
        void speakText(text);
    }, [autoSpeak, messages, speakText, status]);

    const onSubmit = useCallback(
        async (message: PromptInputMessage) => {
            if (createSessionMutation.error) createSessionMutation.reset();
            if (error) clearError();

            try {
                await ensureSession();
                void sendMessage({ text: message.text, files: message.files });
            } catch (err) {
                throw err;
            }
        },
        [clearError, createSessionMutation, ensureSession, error, sendMessage],
    );

    if (!isLoaded) {
        return <div className="p-2 text-sm text-neutral-600">Caricamento…</div>;
    }

    if (!isSignedIn) {
        return (
            <div className="p-2 text-sm text-neutral-600">
                Accedi per testare la voce con ElevenLabs.
            </div>
        );
    }

    if (tokenLoading || !authToken) {
        return (
            <div className="p-2 text-sm text-neutral-600">
                Autenticazione in corso…
            </div>
        );
    }

    const canSend = status !== "submitted" && status !== "streaming";

    return (
        <div className="w-full h-full min-h-0 flex flex-col gap-3">
            <div className="flex flex-col gap-2 border-b border-b-neutral-100 pb-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                        <div className="text-sm font-medium">
                            Voice Test (ElevenLabs) · Persona Chat
                        </div>
                        <div className="text-xs text-neutral-500">
                            Modello: <span className="font-mono">gpt-5.1-chat-latest</span>
                            {personalityInfo ? (
                                <>
                                    {" "}
                                    · persona:{" "}
                                    <span className="font-mono">v{personalityInfo.version}</span>
                                </>
                            ) : null}
                            {sessionId ? (
                                <>
                                    {" "}
                                    · session: <span className="font-mono">{sessionId}</span>
                                </>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setAutoSpeak((v) => !v)}
                        >
                            Auto: {autoSpeak ? "ON" : "OFF"}
                        </Button>
                        <Button type="button" variant="secondary" onClick={stopAudio}>
                            Stop audio
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                        <Label>Voice</Label>
                        {voicesQuery.isLoading ? (
                            <div className="text-sm text-neutral-600">Caricamento…</div>
                        ) : voicesQuery.isError ? (
                            <div className="text-sm text-destructive">
                                {voicesQuery.error.message}
                            </div>
                        ) : (
                            <Select value={voiceId} onValueChange={setVoiceId}>
                                <SelectTrigger className="w-[260px]">
                                    <SelectValue placeholder="Seleziona una voice" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(voicesQuery.data ?? []).map((v) => (
                                        <SelectItem key={v.voiceId} value={v.voiceId}>
                                            {v.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            onClick={() => {
                                const lastAssistant = [...messages]
                                    .reverse()
                                    .find((m) => m.role === "assistant");
                                if (!lastAssistant) return;
                                void speakText(extractMessageText(lastAssistant));
                            }}
                            disabled={
                                ttsMutation.isPending ||
                                !messages.some((m) => m.role === "assistant")
                            }
                        >
                            Ripeti ultima risposta
                        </Button>
                        {ttsMutation.isPending ? (
                            <Badge variant="secondary">TTS…</Badge>
                        ) : null}
                    </div>
                </div>

                <audio
                    ref={audioRef}
                    controls
                    className="w-full"
                    onError={() => setAudioError("Errore nella riproduzione audio.")}
                />

                {audioError ? (
                    <div className="text-xs text-destructive">{audioError}</div>
                ) : null}
            </div>

            <Conversation className="w-full flex-1 min-h-0">
                <ChatMessages
                    messages={messages}
                    onInit={() => void ensureSession()}
                    initDisabled={createSessionMutation.isPending}
                    initLabel={
                        createSessionMutation.isPending ? "Inizializzo…" : "Inizia test"
                    }
                />
                <ScrollToBottomOnSend
                    status={status}
                    messagesLength={messages.length}
                />
                <ConversationScrollButton />
            </Conversation>

            <div className="shrink-0">
                <div className="px-2 pb-2">
                    <ChatInput
                        handleSubmit={onSubmit}
                        status={status}
                        disabled={!canSend}
                    />
                    {createSessionMutation.error && (
                        <p className="mt-2 text-xs text-destructive">
                            {createSessionMutation.error.message}
                        </p>
                    )}
                    {error && (
                        <p className="mt-2 text-xs text-destructive">{error.message}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function ScrollToBottomOnSend({
    status,
    messagesLength,
}: {
    status: ChatStatus;
    messagesLength: number;
}) {
    const { scrollToBottom } = useStickToBottomContext();

    useEffect(() => {
        if (status !== "submitted" && status !== "streaming") return;
        void scrollToBottom({ animation: "smooth" });
    }, [messagesLength, scrollToBottom, status]);

    return null;
}
