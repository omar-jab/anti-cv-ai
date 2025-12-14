import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import type { FileUIPart, UIMessage } from "ai";

interface Props {
  connectionError: string | null;
  isConnecting: boolean;
  messages: UIMessage[];
}

function getText(message: UIMessage) {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();
}

function getAttachments(message: UIMessage): FileUIPart[] {
  return message.parts.filter((p) => p.type === "file");
}

export default function ChatConversation({
  connectionError,
  isConnecting,
  messages,
}: Props) {
  const visible = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  if (connectionError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {connectionError}
      </div>
    );
  }

  if (isConnecting && visible.length === 0) {
    return (
      <ConversationEmptyState
        title="Connessione…"
        description="Sto preparando la conversazione"
      />
    );
  }

  if (visible.length === 0) {
    return (
      <ConversationEmptyState
        title="Nessun messaggio"
        description="Scrivi il primo messaggio per iniziare"
      />
    );
  }

  return (
    <Conversation className="h-full">
      <ConversationContent className="mx-auto w-full max-w-2xl overflow-y-auto">
        {visible.map((message) => {
          const text = getText(message);
          const attachments = getAttachments(message);

          return (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {attachments.length > 0 ? (
                  <MessageAttachments>
                    {attachments.map((file, index) => (
                      <MessageAttachment
                        data={file}
                        key={`${message.id}-${index}`}
                      />
                    ))}
                  </MessageAttachments>
                ) : null}
                {text ? <MessageResponse>{text}</MessageResponse> : null}
              </MessageContent>
            </Message>
          );
        })}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
