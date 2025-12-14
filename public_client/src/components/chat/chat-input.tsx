import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputProvider,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import type { ChatStatus } from "ai";
import { useRef } from "react";

interface Props {
  disabled?: boolean;
  onSend: (message: PromptInputMessage) => void | Promise<void>;
  status?: ChatStatus;
}

function ChatInputInner({ disabled, onSend, status }: Props) {
  const controller = usePromptInputController();
  const attachments = usePromptInputAttachments();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const hasText = controller.textInput.value.trim().length > 0;
  const hasFiles = attachments.files.length > 0;
  const canSubmit = !disabled && (hasText || hasFiles);

  return (
    <PromptInput
      onSubmit={(message) => onSend(message)}
      className="mt-4 w-full"
      globalDrop
      multiple
    >
      <PromptInputBody>
        <PromptInputTextarea
          ref={textareaRef}
          placeholder="Scrivi un messaggio"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <PromptInputSpeechButton
            onTranscriptionChange={(text) =>
              controller.textInput.setInput(text)
            }
            textareaRef={textareaRef}
          />
        </PromptInputTools>
        <PromptInputSubmit disabled={!canSubmit} status={status} />
      </PromptInputFooter>
    </PromptInput>
  );
}

export default function ChatInput(props: Props) {
  return (
    <PromptInputProvider>
      <ChatInputInner {...props} />
    </PromptInputProvider>
  );
}
