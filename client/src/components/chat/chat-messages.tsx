import {
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import type { UIMessage } from "ai";
import ChatMessage from "@/components/chat/chat-message";
import { Button } from "../ui/button";

interface Props {
  messages: UIMessage[];
  onInit?: () => void;
  initDisabled?: boolean;
  initLabel?: string;
}

export default function ChatMessages({
  messages,
  onInit,
  initDisabled,
  initLabel,
}: Props) {
  if (messages.length === 0 || !messages) {
    return (
      <ConversationEmptyState>
        <p>
          {onInit
            ? "Conversazione vuota, clicca il pulsante se vuoi iniziare!"
            : "Scrivi un messaggio per iniziare la conversazione."}
        </p>
        {onInit && (
          <Button onClick={onInit} disabled={initDisabled}>
            {initLabel ?? "Inizia Ora"}
          </Button>
        )}
      </ConversationEmptyState>
    );
  }

  return (
    <ConversationContent>
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </ConversationContent>
  );
}
