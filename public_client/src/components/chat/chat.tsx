import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatInput from "./chat-input";
import ChatConversation from "./chat-conversation";
import { createConversationSession } from "@/lib/api/conversation";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

export default function Chat({ handle }: { handle: string }) {
  const sessionQuery = useQuery({
    queryKey: ["conversation-session", handle],
    queryFn: () => createConversationSession(handle),
    enabled: !!handle,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const sessionId = sessionQuery.data?.session_id ?? null;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/conversation",
        prepareSendMessagesRequest: ({ messages, messageId }) => {
          if (!sessionId) {
            throw new Error("Conversation session not ready");
          }

          const activeUserMessage =
            (messageId
              ? messages.find((m) => m.id === messageId)
              : undefined) ??
            [...messages].reverse().find((m) => m.role === "user");

          if (!activeUserMessage) {
            throw new Error("Missing user message");
          }

          const text = activeUserMessage.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("")
            .trim();

          const fileParts = activeUserMessage.parts
            .filter((p) => p.type === "file")
            .map((p) => ({
              type: "file" as const,
              mediaType: p.mediaType,
              filename: p.filename,
              url: p.url,
            }));

          const message: { content?: string; parts?: unknown[] } = {};
          if (text) message.content = text;
          if (fileParts.length > 0) message.parts = fileParts;

          return {
            body: {
              handle,
              session_id: sessionId,
              message,
            },
          };
        },
      }),
    [handle, sessionId],
  );

  const chat = useChat<UIMessage>(
    sessionId ? { id: sessionId, transport } : { transport },
  );

  const canInteract = !!sessionId && sessionQuery.status === "success";
  const isBusy = chat.status === "submitted" || chat.status === "streaming";
  const inputDisabled = !canInteract || isBusy;

  const handleSend = useCallback(
    async (message: PromptInputMessage) => {
      if (!sessionId) {
        throw new Error("Conversation session not ready");
      }

      await chat.sendMessage({
        text: message.text,
        files: message.files,
      });
    },
    [chat, sessionId],
  );

  return (
    <div className="w-full h-full">
      <Tabs
        defaultValue="testuale"
        className="w-full h-full flex min-h-0 flex-col"
      >
        <div className="w-full">
          <div className="mx-auto w-fit p-3">
            <TabsList>
              <TabsTrigger value="testuale">Testuale</TabsTrigger>
              <TabsTrigger value="vocale">Vocale</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="testuale" className="flex-1 min-h-0">
          <div className="flex flex-col w-full h-full min-h-0">
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
              <ChatConversation
                isConnecting={sessionQuery.isPending}
                connectionError={sessionQuery.error?.message ?? null}
                messages={chat.messages}
              />
            </div>
            <div className="mx-auto max-w-2xl w-full shrink-0 p-3">
              <ChatInput
                disabled={inputDisabled}
                onSend={handleSend}
                status={chat.status}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="vocale">
          <p>In arrivo...</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
