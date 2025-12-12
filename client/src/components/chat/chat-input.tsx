import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputHeader,
} from "@/components/ai-elements/prompt-input";
import type { ChatStatus } from "ai";
import { useRef } from "react";

interface Props {
  prompt: string;
  setPrompt: (value: string) => void;
  handleSubmit: () => void;
  status: ChatStatus;
}

export default function ChatInput({
  prompt,
  setPrompt,
  handleSubmit,
  status,
}: Props) {
  const textareaRef = useRef(null);

  return (
    <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
      <PromptInputHeader>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea
          onChange={(e) => setPrompt(e.target.value)}
          ref={textareaRef}
          value={prompt}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputSubmit disabled={!prompt && !status} status={status} />
      </PromptInputFooter>
    </PromptInput>
  );
}
