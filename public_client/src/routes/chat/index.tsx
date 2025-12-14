import Chat from "@/components/chat/chat";
import ProfilePanel from "@/components/chat/profile/profile-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useLoaderData } from "react-router";
import { usePublicUser } from "@/hooks/use-public-user";

export default function ChatPage() {
  const { handle } = useLoaderData() as { handle: string };
  const { data, isLoading, isError } = usePublicUser({ handle });

  // Costruisci i dati utente per ProfilePanel
  const userData = data
    ? {
        imageUrl: data.user.imageUrl || undefined,
        name: data.user.firstName || "Utente",
        surname: data.user.lastName || "",
        role: data.cv?.personalInfo.role || "N/A",
        email: data.user.email || "",
        phone: data.user.phone || undefined,
        location: data.user.city || data.cv?.personalInfo.location || undefined,
        website: data.cv?.personalInfo.website || undefined,
        bio: data.cv?.personalInfo.summary || undefined,
        status: "active" as const,
      }
    : {
        imageUrl: undefined,
        name: "Caricamento...",
        surname: "",
        role: "N/A",
        email: "",
        status: "active" as const,
      };

  return (
    <div className="w-screen h-dvh">
      <ResizablePanelGroup direction="horizontal" className="w-full h-full">
        <ResizablePanel minSize={20} maxSize={50} className="w-full h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">Caricamento...</p>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-500">Errore nel caricamento dei dati</p>
            </div>
          ) : (
            <ProfilePanel user={userData} cvData={data?.cv || null} />
          )}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel minSize={30} maxSize={80} className="w-full h-full">
          <Chat handle={handle} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
