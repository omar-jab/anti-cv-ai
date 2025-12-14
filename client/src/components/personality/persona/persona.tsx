import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useLatestPersonality,
  usePersonalityVersion,
  usePersonalityVersions,
} from "@/hooks/use-personality";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export default function Persona() {
  const latest = useLatestPersonality();
  const versions = usePersonalityVersions(50);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const previousLatestIdRef = useRef<string | null>(null);

  useEffect(() => {
    const latestId = latest.personality?.id ?? null;
    const previousLatestId = previousLatestIdRef.current;
    previousLatestIdRef.current = latestId;

    if (!latestId) {
      if (!selectedId && versions.versions.length > 0) {
        setSelectedId(versions.versions[0]!.id);
      }
      return;
    }

    if (!selectedId || (previousLatestId && selectedId === previousLatestId)) {
      setSelectedId(latestId);
    }
  }, [latest.personality?.id, selectedId, versions.versions]);

  const isLatestSelected = Boolean(
    selectedId &&
    latest.personality?.id &&
    selectedId === latest.personality.id,
  );

  const selectedVersion = usePersonalityVersion(
    selectedId,
    !!selectedId && !isLatestSelected,
  );

  const selectedPersonality = useMemo(() => {
    if (!selectedId) return null;
    if (isLatestSelected) return latest.personality;
    return selectedVersion.personality;
  }, [
    isLatestSelected,
    latest.personality,
    selectedId,
    selectedVersion.personality,
  ]);

  if (!latest.isLoaded || !versions.isLoaded) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Caricamento…
      </div>
    );
  }

  if (!latest.isSignedIn || !versions.isSignedIn) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Accedi per vedere la tua persona.
      </div>
    );
  }

  if (latest.query.isLoading || versions.query.isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Caricamento…
      </div>
    );
  }

  if (latest.query.isError) {
    return (
      <div className="p-6 text-sm text-destructive">
        Errore nel caricare l’ultima persona.
      </div>
    );
  }

  if (versions.query.isError) {
    return (
      <div className="p-6 text-sm text-destructive">
        Errore nel caricare la lista delle personas.
      </div>
    );
  }

  const isEmpty = !latest.personality && (versions.versions ?? []).length === 0;

  if (isEmpty) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Nessuna persona disponibile. Premi “Aggiorna Personalità” per crearne
        una.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="flex min-h-0 flex-col border-b border-b-border md:border-b-0 md:border-r md:border-r-border md:w-72 shrink-0">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="text-sm font-medium">Personas</div>
          {latest.personality?.id && (
            <Badge variant="secondary">v{latest.personality.version}</Badge>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-1 p-2">
            {versions.versions.map((v, index) => {
              const isLatest = latest.personality?.id
                ? v.id === latest.personality.id
                : index === 0;
              const isSelected = selectedId === v.id;

              return (
                <Button
                  key={v.id}
                  variant="ghost"
                  className={cn(
                    "h-auto justify-start px-2 py-2 rounded-md",
                    isSelected && "bg-secondary hover:bg-secondary",
                  )}
                  onClick={() => setSelectedId(v.id)}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">v{v.version}</span>
                        {isLatest && <Badge>Latest</Badge>}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(v.updatedAt || v.createdAt)}
                      </span>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-b-border px-4 py-2 flex items-center justify-between">
          <div className="text-sm font-medium">
            {selectedPersonality
              ? `Persona v${selectedPersonality.version}`
              : "Persona"}
          </div>
          {selectedPersonality?.updatedAt && (
            <span className="text-[11px] text-muted-foreground">
              {formatDate(selectedPersonality.updatedAt)}
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {selectedId &&
          selectedVersion.query.isLoading &&
          !isLatestSelected ? (
            <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Caricamento persona…
            </div>
          ) : selectedVersion.query.isError && !isLatestSelected ? (
            <div className="p-6 text-sm text-destructive">
              Errore nel caricare la persona selezionata.
            </div>
          ) : selectedPersonality?.content ? (
            <div className="px-4 py-3">
              <Streamdown className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                {selectedPersonality.content}
              </Streamdown>
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              Seleziona una persona dalla lista.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
