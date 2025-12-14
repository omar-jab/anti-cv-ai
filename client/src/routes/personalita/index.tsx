import Chat from "@/components/chat/chat";
import Preview from "@/components/personality/preview";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function PersonalitaPage() {
  return (
    <div className="w-full flex-1 min-h-0 flex min-w-0">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          className="min-h-0 min-w-0 flex flex-col"
          defaultSize={30}
          minSize={30}
        >
          <Chat />
        </ResizablePanel>
        <ResizableHandle className="w-[0.5px] bg-neutral-100 hover:bg-neutral-400" />
        <ResizablePanel
          className="min-h-0 min-w-0 border-l border-l-neutral-100 flex flex-col"
          minSize={30}
          defaultSize={60}
        >
          <Preview />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
