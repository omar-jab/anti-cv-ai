import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UserMemoryItem } from "@/hooks/use-memory";
import { cn } from "@/lib/utils";
import { Maximize2, FileText, CalendarDays, Bookmark } from "lucide-react";

interface Props {
  memory: UserMemoryItem;
  index: number;
  side: "left" | "right";
}

export default function Memory({ memory, index, side }: Props) {
  // Troncatura intelligente
  const truncatedContent = (() => {
    const words = memory.content.split(/\s+/);
    if (words.length <= 25) return memory.content;
    return words.slice(0, 25).join(" ") + "...";
  })();

  // Colori "Dossier" (Meno saturi, più carta)
  const markerColor =
    index % 3 === 0
      ? "bg-blue-400"
      : index % 3 === 1
        ? "bg-emerald-400"
        : "bg-amber-400";

  return (
    <Dialog>
      <div className="relative flex items-center group z-10">
        {/* --- 1. CONNESSIONI (Assoni) --- */}
        {/* Linea Desktop */}
        <div
          className={cn(
            "hidden md:block absolute top-1/2 -translate-y-1/2 h-px bg-slate-300 transition-all duration-300 w-16 -z-20",
            side === "right" ? "-left-16 origin-right" : "hidden",
          )}
        />
        <div
          className={cn(
            "hidden md:block absolute top-1/2 -translate-y-1/2 h-px bg-slate-300 transition-all duration-300 w-16 -z-20",
            side === "left" ? "-right-16 origin-left" : "hidden",
          )}
        />
        {/* Linea Mobile */}
        <div className="md:hidden absolute top-6 -left-8 w-8 h-px bg-slate-300" />

        {/* --- 2. PREVIEW CARD (Stile Dossier/Paper) --- */}
        <DialogTrigger asChild>
          <div className="relative w-full cursor-pointer transition-transform duration-300 hover:-translate-y-1">
            {/* Foglio Sottostante (Shadow Paper) */}
            <div className="absolute inset-0 bg-slate-100 border border-slate-200 translate-x-1.5 translate-y-1.5 -z-10" />

            {/* Foglio Principale */}
            <div className="bg-white border border-slate-200 p-5 relative overflow-hidden group-hover:border-slate-300 transition-colors">
              {/* Marker Laterale (Stile Etichetta) */}
              <div
                className={cn(
                  "absolute top-0 left-0 bottom-0 w-1",
                  markerColor,
                )}
              />

              {/* Texture Carta (Opzionale) */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

              {/* Contenuto Preview */}
              <div className="pl-3 space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-serif text-lg text-slate-900 leading-tight group-hover:underline decoration-slate-300 underline-offset-4 decoration-1">
                    {memory.title}
                  </h3>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Maximize2 className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Text Body */}
                <p className="font-serif text-sm text-slate-500 leading-relaxed italic">
                  "{truncatedContent}"
                </p>

                {/* Footer Meta */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-50">
                  <Badge
                    variant="secondary"
                    className="bg-slate-50 text-slate-600 border border-slate-100 rounded-sm font-mono text-[10px] tracking-wider uppercase h-5 px-1.5"
                  >
                    {memory.section}
                  </Badge>
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: {String(memory.id).slice(-4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogTrigger>

        {/* --- 3. DIALOG DETAIL (Il Documento Completo) --- */}
        <DialogContent className="max-w-3xl w-[95vw] p-0 gap-0 border-slate-200 bg-[#fdfdfd] shadow-2xl rounded-sm overflow-hidden block">
          {/* Header del Documento */}
          <div className="bg-slate-50 border-b border-slate-200 p-6 md:p-8 flex flex-col gap-4 relative">
            {/* Timbro "Archived" Decorativo */}
            <div className="absolute top-4 right-6 border-2 border-slate-200 rounded px-2 py-1 rotate-[-5deg] opacity-50 pointer-events-none">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                MEMORY LOG
              </span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Badge
                className={cn(
                  "rounded-sm px-2 font-mono text-xs text-white border-0",
                  markerColor,
                )}
              >
                {memory.section}
              </Badge>
              <span className="text-xs font-mono text-slate-400">
                / REF: {memory.id}
              </span>
            </div>

            <DialogHeader>
              <DialogTitle className="font-serif text-3xl md:text-4xl text-slate-900 leading-tight">
                {memory.title}
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-4 text-xs text-slate-500 font-mono mt-2">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Recorded: Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>{memory.content.length} chars</span>
              </div>
            </div>
          </div>

          {/* Corpo del Documento (Scrollabile) */}
          <ScrollArea className="h-[60vh] md:max-h-[600px] w-full bg-white">
            <div className="p-8 md:p-12 max-w-none">
              {/* Contenuto Tipografico */}
              <div className="prose prose-slate prose-lg max-w-none">
                <p className="font-serif text-slate-700 leading-8 whitespace-pre-wrap text-lg">
                  {memory.content}
                </p>
              </div>

              {/* Footer del Documento */}
              <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                    Synaptic End-Point
                  </p>
                  <div className="w-8 h-1 bg-slate-200" />
                </div>
                <Bookmark className="w-5 h-5 text-slate-300" />
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </div>
    </Dialog>
  );
}
