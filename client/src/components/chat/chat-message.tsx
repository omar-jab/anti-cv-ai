import type { UIMessage } from "ai";
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
    <Message
      from={message.role}
      key={message.id}
      className="max-w-3xl mx-auto px-6 py-2"
    >
      <MessageContent>
        {message.parts.map((part, i) => {
          switch (part.type) {
            case "text":
              return (
                <MessageResponse key={`${message.id}-${i}`}>
                  {part.text}
                </MessageResponse>
              );
            case "file": {
              const isImage = part.mediaType?.startsWith("image/");
              if (isImage) {
                return (
                  <div key={`${message.id}-${i}`} className="mt-2">
                    <img
                      src={part.url}
                      alt={part.filename ?? "image"}
                      className="max-h-64 rounded-md border object-contain"
                    />
                  </div>
                );
              }

              return (
                <a
                  key={`${message.id}-${i}`}
                  href={part.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm underline"
                >
                  {part.filename ?? "Apri allegato"}
                </a>
              );
            }
            default:
              return null;
          }
        })}
      </MessageContent>
    </Message>
  );
}
