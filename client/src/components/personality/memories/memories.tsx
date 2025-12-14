import { useMemory } from "@/hooks/use-memory";
import Memory from "./memory";
import { Loader2 } from "lucide-react"; // Solo per il loading state

export default function Memories() {
  const { isLoaded, isSignedIn, memories, query } = useMemory();

  // Loading State Minimal
  if (!isLoaded || query.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  // Auth / Empty States
  if (!isSignedIn) return null;
  if (memories.length === 0) return null; // O un placeholder minimale se preferisci

  return (
    <div className="min-h-screen w-full bg-slate-50/50 relative overflow-hidden">
      {/* Background Sottile: Pattern a griglia millimetrata */}
      <div
        className="absolute inset-0 z-0 opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* CONTENITORE PRINCIPALE */}
        <div className="relative">
          {/* 1. LA LINEA CENTRALE (Spina Dorsale) */}
          {/* Corre dall'alto (top-0) al basso (bottom-0) */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-slate-300" />

          {/* 2. NODO INIZIALE (Pallino in alto) */}
          <div className="absolute left-4 md:left-1/2 -translate-x-1/2 top-0 w-2 h-2 bg-slate-300 rounded-full z-10" />

          {/* 3. LISTA MEMORIE */}
          {/* Padding verticale (py-12) per staccare le card dai pallini inizio/fine */}
          <div className="flex flex-col gap-12 py-12">
            {memories.map((memory, index) => {
              // Determina se la card va a destra o sinistra (solo su desktop)
              const isEven = index % 2 === 0;

              return (
                <div
                  key={memory.id}
                  className={`flex md:items-center w-full ${isEven ? "md:flex-row" : "md:flex-row-reverse"} relative`}
                >
                  {/* Spazio vuoto per bilanciare la colonna opposta */}
                  <div className="hidden md:block md:w-1/2" />

                  {/* Punto di connessione centrale (Il Nodo sulla spina dorsale per ogni memory) */}
                  <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-slate-400 rounded-full z-20" />

                  {/* IL COMPONENTE MEMORY */}
                  <div className="flex-1 pl-12 md:pl-0 w-full">
                    <div
                      className={`w-full ${isEven ? "md:pl-12" : "md:pr-12"}`}
                    >
                      <Memory
                        memory={memory}
                        index={index}
                        side={isEven ? "right" : "left"}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. NODO FINALE (Pallino in basso) */}
          <div className="absolute left-4 md:left-1/2 -translate-x-1/2 bottom-0 w-2 h-2 bg-slate-300 rounded-full z-10" />
        </div>
      </div>
    </div>
  );
}
