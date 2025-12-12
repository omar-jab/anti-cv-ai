import { MessageSquare } from "lucide-react";
import {
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import type { UIMessage } from "ai";
import ChatMessage from "@/components/chat/chat-message";

interface Props {
  messages: UIMessage[];
}

export default function ChatMessages({ messages }: Props) {
  if (messages.length === 0 || !messages) {
    return (
      <ConversationEmptyState
        icon={<MessageSquare className="size-12" />}
        title="Inizia la conversazione"
        description="Inizia a scrivere"
      />
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
