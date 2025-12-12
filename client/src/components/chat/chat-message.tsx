import type { ModelMessage, UIMessage } from "ai";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

interface Props {
  message: UIMessage;
}

export default function ChatMessage({ message }: Props) {
  return (
    <Message from={message.role} key={message.id}>
      <MessageContent>
        {message.parts.map((part, i) => {
          switch (part.type) {
            case "text":
              return (
                <MessageResponse key={`${message.id}-${i}`}>
                  {part.text}
                </MessageResponse>
              );
            default:
              return null;
          }
        })}
      </MessageContent>
    </Message>
  );
}
