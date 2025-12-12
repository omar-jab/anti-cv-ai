import {
  Conversation,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import ChatMessages from "./chat-messages";
import ChatInput from "./chat-input";
import { useState } from "react";

export default function Chat() {
  const [prompt, setPrompt] = useState<string>("");
  async function handleSubmit() {
    console.log("we");
  }

  return (
    <div className="w-full h-full flex flex-col">
      <Conversation className="w-full h-full">
        <ChatMessages messages={[]} />
        <ConversationScrollButton />
      </Conversation>
      <div>
        <div className="max-w-3xl mx-auto px-6 py-2">
          <ChatInput
            handleSubmit={handleSubmit}
            prompt={prompt}
            setPrompt={setPrompt}
            status="ready"
          />
        </div>
      </div>
    </div>
  );
}
