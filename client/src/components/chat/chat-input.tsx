import {
  PromptInput,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputProvider,
  usePromptInputAttachments,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import type { ChatStatus } from "ai";

interface Props {
  handleSubmit: (message: PromptInputMessage) => void | Promise<void>;
  status: ChatStatus;
  disabled?: boolean;
}

function ChatInputInner({ handleSubmit, status, disabled }: Props) {
  const { textInput } = usePromptInputController();
  const attachments = usePromptInputAttachments();

  const canSubmit =
    textInput.value.trim().length > 0 || attachments.files.length > 0;

  return (
    <PromptInput
      onSubmit={handleSubmit}
      className="mt-4 rounded-3xl!"
      globalDrop
      multiple
    >
      <PromptInputBody>
        <PromptInputTextarea placeholder="Inizia a scrivere" />
      </PromptInputBody>
      <PromptInputFooter>
        <div></div>
        <PromptInputSubmit disabled={disabled || !canSubmit} status={status} />
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
