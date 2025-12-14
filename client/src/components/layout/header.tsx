import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";
import {
  Drama,
  FingerprintPattern,
  Globe,
  Loader2,
  PersonStanding,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "../ui/button";
import { usePersonalityJob } from "@/hooks/use-personality-job";
import { useProfile } from "@/hooks/use-profile";
import { DatiGenerali } from "../personality/dati-generali/dati-generali";

// URL base per il link esterno dell'anteprima
// Modificare questo valore per cambiare il link di destinazione
const PREVIEW_BASE_URL = "https://example.com";

export default function Header() {
  const { isRunning, job, startMutation, start } = usePersonalityJob();
  const { profile } = useProfile();

  const handlePreviewClick = () => {
    if (!profile?.handle) {
      // Se l'utente non ha un handle, non aprire nulla o mostrare un messaggio
      return;
    }
    const previewUrl = `${PREVIEW_BASE_URL}/${profile.handle}`;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <header className="border-b border-b-neutral-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-fit h-full p-2 border-r border-r-neutral-100">
            <FingerprintPattern className="size-6" />
          </div>

          <ul className="flex items-center gap-6 p-2">
            <li className="font-mono text-sm text-neutral-800">
              <Link to={{ pathname: "/personalita" }}>
                <div className="flex items-center gap-2">
                  <Drama size={16} />
                  <span>Builder</span>
                </div>
              </Link>
            </li>
          </ul>
        </div>
        <SignedOut>
          <div className="flex items-center gap-2 p-2">
            <SignInButton>
              <p>Accedi</p>
            </SignInButton>
          </div>
        </SignedOut>
        <SignedIn>
          <div className="flex items-center gap-2 p-2">
            <div className="flex flex-col items-end gap-1">
              <Button
                variant={"secondary"}
                onClick={start}
                disabled={isRunning}
                className="flex items-center gap-1"
              >
                {isRunning ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <PersonStanding />
                )}
                <span>
                  {isRunning
                    ? "Aggiornamento in corso…"
                    : "Aggiorna Personalità"}
                </span>
              </Button>

              {job?.status === "failed" && (
                <span className="text-[11px] text-destructive">
                  Aggiornamento fallito. Riprova.
                </span>
              )}
              {startMutation.isError && (
                <span className="text-[11px] text-destructive">
                  Errore richiesta. Riprova.
                </span>
              )}
            </div>

            <div>
              <Button
                variant={"secondary"}
                className="flex items-center gap-1"
                onClick={handlePreviewClick}
                disabled={!profile?.handle}
              >
                <Globe />
                <span>Anteprima</span>
              </Button>
            </div>

            <DatiGenerali />

            <UserButton />
          </div>
        </SignedIn>
      </div>

      {isRunning && (
        <div className="h-1 w-full bg-neutral-100 overflow-hidden">
          <div className="h-full w-1/3 bg-primary progress-indeterminate" />
        </div>
      )}
    </header>
  );
}
