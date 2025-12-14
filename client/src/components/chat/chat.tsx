import {
  Conversation,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import ChatMessages from "./chat-messages";
import ChatInput from "./chat-input";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolOrDynamicToolName,
  isToolOrDynamicToolUIPart,
  type ChatStatus,
  type UIMessage,
} from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "../ui/badge";

type ChatPersonalityRequestFilePart = {
  type: "file";
  mediaType: string;
  filename?: string;
  url: string;
};

export default function Chat() {
  const { getToken, isSignedIn, isLoaded, userId } = useAuth();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);

  const queryClient = useQueryClient();
  const [chatInstanceId] = useState(() => crypto.randomUUID());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const createSessionPromiseRef = useRef<Promise<string> | null>(null);
  const [scrollToBottomRequest, setScrollToBottomRequest] = useState(0);
  const handledMemoryToolCallsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) setSessionId(null);
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const token = authToken ?? (await getToken());
      const res = await fetch("/api/chat/session", {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { session_id?: unknown };
      const sessionId = data?.session_id;
      if (typeof sessionId !== "string" || !sessionId) {
        throw new Error("Invalid session response");
      }

      return sessionId;
    },
  });

  // Ottieni il token all'avvio e quando cambia lo stato auth
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      setTokenLoading(true);
      getToken()
        .then((token) => {
          console.log("Token obtained:", token ? "✓" : "✗");
          setAuthToken(token);
        })
        .finally(() => setTokenLoading(false));
    } else {
      setAuthToken(null);
      setTokenLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  const transport = useMemo(() => {
    console.log(
      "Creating transport with token:",
      authToken ? "present" : "missing",
    );
    return new DefaultChatTransport({
      api: "/api/chat/personality",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
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
            message: uiMessageToPersonalityPayload(message),
          },
        };
      },
    });
  }, [authToken]);

  const { messages, sendMessage, status, error, clearError } = useChat({
    id: chatInstanceId,
    transport,
  });

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const seen = handledMemoryToolCallsRef.current;
    let hasNew = false;

    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts) {
        if (!isToolOrDynamicToolUIPart(part)) continue;

        const toolName = getToolOrDynamicToolName(part);
        if (toolName !== "updateMemory") continue;
        if (part.state !== "output-available") continue;

        if (!part.toolCallId || seen.has(part.toolCallId)) continue;
        seen.add(part.toolCallId);
        hasNew = true;
      }
    }

    if (hasNew) {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    }
  }, [messages, queryClient, isLoaded, isSignedIn, userId]);

  async function ensureSessionId() {
    const existing = sessionIdRef.current;
    if (existing) return existing;

    if (createSessionPromiseRef.current) {
      return createSessionPromiseRef.current;
    }

    const promise = createSessionMutation
      .mutateAsync()
      .then((newSessionId) => {
        sessionIdRef.current = newSessionId;
        setSessionId(newSessionId);
        return newSessionId;
      })
      .finally(() => {
        createSessionPromiseRef.current = null;
      });

    createSessionPromiseRef.current = promise;
    return promise;
  }

  async function handleSubmit(message: PromptInputMessage) {
    if (createSessionMutation.error) createSessionMutation.reset();
    if (error) clearError();

    setScrollToBottomRequest((n) => n + 1);

    try {
      await ensureSessionId();
      void sendMessage({ text: message.text, files: message.files });
    } catch (err) {
      // Errors are shown via createSessionMutation.error or useChat error.
      // Rethrow so the PromptInput keeps the user input for retry.
      throw err;
    }
  }

  // Loading Clerk
  if (!isLoaded) {
    return (
      <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  // Se l'utente non è loggato, mostra un messaggio
  if (!isSignedIn) {
    return (
      <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center">
        <p className="text-muted-foreground">
          Effettua il login per iniziare la conversazione
        </p>
      </div>
    );
  }

  // Aspetta che il token sia pronto
  if (tokenLoading || !authToken) {
    return (
      <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Autenticazione in corso...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
      {sessionId && (
        <div className="shrink-0 border-b border-b-neutral-100">
          <div className="max-w-3xl mx-auto px-6 py-2">
            <Badge variant="outline" className="font-mono" title={sessionId}>
              Sessione {sessionId.slice(0, 8)}
            </Badge>
          </div>
        </div>
      )}

      <Conversation className="w-full flex-1 min-h-0">
        <ChatMessages messages={messages} />
        <ScrollToBottomOnSend
          request={scrollToBottomRequest}
          status={status}
          messagesLength={messages.length}
        />
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0">
        <div className="max-w-3xl mx-auto px-6 py-2">
          <ChatInput
            handleSubmit={handleSubmit}
            status={status}
            disabled={
              createSessionMutation.isPending ||
              status === "submitted" ||
              status === "streaming"
            }
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
  request,
  status,
  messagesLength,
}: {
  request: number;
  status: ChatStatus;
  messagesLength: number;
}) {
  const { scrollToBottom } = useStickToBottomContext();

  useEffect(() => {
    if (request === 0) return;
    if (status !== "submitted" && status !== "streaming") return;
    void scrollToBottom({ animation: "smooth" });
  }, [request, status, messagesLength, scrollToBottom]);

  return null;
}

function uiMessageToPersonalityPayload(message: UIMessage) {
  let content = "";
  const parts: ChatPersonalityRequestFilePart[] = [];

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
  const payload: {
    content?: string;
    parts?: ChatPersonalityRequestFilePart[];
  } = {};

  if (trimmed) payload.content = trimmed;
  if (parts.length) payload.parts = parts;

  return payload;
}
