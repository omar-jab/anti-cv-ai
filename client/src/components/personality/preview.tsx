import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Memories from "./memories/memories";
import Persona from "./persona/persona";
import ElevenLabsVoiceTester from "./test/elevenlabs-voice-tester";

export default function Preview() {
  return (
    <div className="w-full flex-1 min-h-0 flex flex-col">
      <Tabs defaultValue="memories" className="w-full flex-1 min-h-0 gap-0">
        <div className="p-2 border-b border-b-neutral-100 shrink-0">
          <div>
            <TabsList>
              <TabsTrigger value="memories">Memories</TabsTrigger>
              <TabsTrigger value="persona">Persona</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent
          value="memories"
          className="mt-0 pt-0 flex flex-col min-h-0"
        >
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <Memories />
          </div>
        </TabsContent>

        <TabsContent
          value="persona"
          className="mt-0 pt-0 flex flex-col min-h-0"
        >
          <Persona />
        </TabsContent>
      </Tabs>
    </div>
  );
}
