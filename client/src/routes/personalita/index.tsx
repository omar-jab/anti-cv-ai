import Chat from "@/components/chat/chat";

export default function PersonalitaPage() {
  return (
    <div className="w-full h-full flex">
      <div className="flex-3">
        <Chat />
      </div>

      <div className="flex-2 border-l border-l-neutral-100"></div>
    </div>
  );
}
