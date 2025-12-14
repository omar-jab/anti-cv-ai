import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAvatar } from "@/hooks/use-avatar";
import { Loader2, Plus, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type AvatarFormData = {
  name: string;
  photos: FileList;
};

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);

export default function AvatarGenerator() {
  const { isLoaded, isSignedIn, avatar, query, createMutation } = useAvatar();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AvatarFormData>({
    defaultValues: {
      name: avatar?.name ?? "",
    },
  });

  const watchedPhotos = useWatch({ control, name: "photos" });

  const selectedFiles = useMemo(() => {
    if (!watchedPhotos) return [];
    return Array.from(watchedPhotos);
  }, [watchedPhotos]);

  const previewUrl = useMemo(() => {
    const file = selectedFiles[0];
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [selectedFiles]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  if (!isLoaded || !isSignedIn) return null;

  // Status Indicator Helper
  const statusColor = (() => {
    const status = avatar?.status ?? null;
    if (status === "completed" || status === "success") return "bg-emerald-500";
    if (status === "moderation_rejected" || status === "failed")
      return "bg-red-500";
    return "bg-amber-400";
  })();

  return (
    <div className="w-full max-w-lg mx-auto py-10">
      {/* CARD CONTAINER: Pulito, shadow morbida, angoli stondati */}
      <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        {/* HEADER VISIVO: Avatar e Stato */}
        <div className="p-8 pb-0 flex flex-col items-center text-center">
          {/* Avatar Circle */}
          <div className="relative mb-4 group">
            <div className="w-32 h-32 rounded-full bg-slate-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : avatar?.imageUrl ? (
                <img
                  src={avatar.imageUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <span className="text-4xl text-slate-200">?</span>
              )}
            </div>

            {/* Status Dot (Minimal) */}
            {avatar && (
              <div
                className={cn(
                  "absolute bottom-2 right-2 w-5 h-5 border-2 border-white rounded-full shadow-sm",
                  statusColor,
                )}
                title={`Stato: ${avatar.status}`}
              />
            )}
          </div>

          {/* Info Testuali */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-800 tracking-tight">
              {avatar?.name || "Nuovo Avatar"}
            </h2>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
              {avatar
                ? `ID: ${avatar.avatarId.slice(0, 6)}...`
                : "Configurazione Iniziale"}
            </p>
          </div>
        </div>

        {/* FORM SECTION */}
        <div className="p-8">
          <form
            onSubmit={handleSubmit((data) => {
              const files = Array.from(data.photos ?? []);
              if (files.length === 0) return;
              createMutation.mutate(
                { name: data.name, files },
                {
                  onSuccess: () => reset({ name: data.name } as AvatarFormData),
                },
              );
            })}
            className="space-y-6"
          >
            {/* Input Nome: Minimalista */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-500 font-medium ml-1">
                Nome Identificativo
              </Label>
              <Input
                placeholder="Es. Il mio clone digitale"
                {...register("name")}
                className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all h-11"
              />
            </div>

            {/* Upload Area: Semplice e Tattile */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-500 font-medium ml-1 flex justify-between">
                <span>Foto Sorgente (Max 4)</span>
                {selectedFiles.length > 0 && (
                  <span className="text-indigo-600">
                    {selectedFiles.length} selezionate
                  </span>
                )}
              </Label>

              <div className="relative group">
                <Input
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                  {...register("photos", {
                    required: "Richiesta almeno una foto",
                    validate: {
                      maxCount: (v) =>
                        v && v.length <= 4 ? true : "Max 4 foto",
                      fileType: (v) =>
                        v &&
                        Array.from(v).every((f) => ALLOWED_TYPES.has(f.type))
                          ? true
                          : "Solo PNG/JPG",
                    },
                  })}
                />

                {/* Visual Feedback Box */}
                <div
                  className={cn(
                    "h-24 rounded-xl border border-dashed flex items-center justify-center gap-3 transition-all duration-300",
                    errors.photos
                      ? "border-red-300 bg-red-50"
                      : selectedFiles.length > 0
                        ? "border-emerald-300 bg-emerald-50/30"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300",
                  )}
                >
                  {selectedFiles.length > 0 ? (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <Check size={18} />
                      <span className="text-sm font-medium">
                        Foto caricate e pronte
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Plus size={16} className="text-slate-400" />
                      </div>
                      <span className="text-sm text-slate-500 font-medium group-hover:text-slate-700">
                        Clicca per aggiungere foto
                      </span>
                    </>
                  )}
                </div>
              </div>

              {errors.photos && (
                <p className="text-xs text-red-500 ml-1">
                  {errors.photos.message}
                </p>
              )}
            </div>

            {/* Buttons Layout */}
            <div className="pt-2 flex items-center gap-3">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 rounded-xl h-11 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 transition-all hover:translate-y-[-1px]"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Elaborazione...
                  </>
                ) : (
                  "Genera Avatar"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
                className="w-11 h-11 rounded-xl border-slate-200 p-0 text-slate-500 hover:bg-slate-50"
                title="Aggiorna stato"
              >
                <RotateCcw
                  className={cn("h-4 w-4", query.isFetching && "animate-spin")}
                />
              </Button>
            </div>
          </form>

          {/* Footer Info discreto */}
          {createMutation.isError && !avatar && (
            <p className="mt-4 text-xs text-center text-red-500 opacity-80">
              {createMutation.error?.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
