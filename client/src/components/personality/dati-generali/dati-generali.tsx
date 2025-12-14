import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Camera, User } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";

type ProfileFormData = {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  citta: string;
  dataNascita: string;
  immagine: FileList;
};

export function DatiGenerali() {
  const [open, setOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const profile = useProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>();

  const canSubmit = useMemo(() => {
    return !profile.updateMutation.isPending;
  }, [profile.updateMutation.isPending]);

  const onSubmit = async (data: ProfileFormData) => {
    const image = data.immagine?.[0] ?? null;

    try {
      await profile.updateMutation.mutateAsync({
        firstName: data.nome,
        lastName: data.cognome,
        email: data.email,
        phone: data.telefono,
        city: data.citta,
        birthDate: data.dataNascita,
        image,
      });
      setOpen(false);
    } catch {
      // errors surfaced via updateMutation.isError
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!profile.profile) return;

    reset({
      nome: profile.profile.firstName ?? "",
      cognome: profile.profile.lastName ?? "",
      email: profile.profile.email ?? "",
      telefono: profile.profile.phone ?? "",
      citta: profile.profile.city ?? "",
      dataNascita: profile.profile.birthDate ?? "",
    });

    setImagePreview(profile.profile.imageUrl ?? null);
  }, [open, profile.profile, reset]);

  const imageField = register("immagine");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] bg-white p-0 gap-0 overflow-hidden rounded-xl border-slate-200">
        {/* HEADER: Pulito e Semplice */}
        <div className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Modifica Profilo
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              Aggiorna le tue informazioni personali e di contatto.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-6">
            {/* 1. SEZIONE AVATAR (Centrale e Discreta) */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group w-20 h-20">
                <div className="w-full h-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-slate-300" />
                  )}
                </div>

                {/* Overlay Upload */}
                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200"
                >
                  <div className="bg-white p-1.5 rounded-full shadow-sm">
                    <Camera className="w-3 h-3 text-slate-700" />
                  </div>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  {...imageField}
                  onChange={(e) => {
                    imageField.onChange(e);
                    handleImageChange(e);
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Clicca per cambiare foto
              </p>
            </div>

            <Separator className="bg-slate-100" />

            {/* 2. GRIGLIA DATI (Ordinata) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="nome"
                  className="text-xs font-medium text-slate-500"
                >
                  Nome
                </Label>
                <Input
                  id="nome"
                  className="h-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  {...register("nome", { required: "Nome obbligatorio" })}
                />
                {errors.nome?.message && (
                  <p className="text-xs text-destructive">
                    {errors.nome.message}
                  </p>
                )}
              </div>

              {/* Cognome */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="cognome"
                  className="text-xs font-medium text-slate-500"
                >
                  Cognome
                </Label>
                <Input
                  id="cognome"
                  className="h-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  {...register("cognome", { required: "Cognome obbligatorio" })}
                />
                {errors.cognome?.message && (
                  <p className="text-xs text-destructive">
                    {errors.cognome.message}
                  </p>
                )}
              </div>

              {/* Data Nascita - Full width on mobile, half on larger if needed, here keeping grid */}
              <div className="col-span-2 space-y-1.5">
                <Label
                  htmlFor="dataNascita"
                  className="text-xs font-medium text-slate-500"
                >
                  Data di Nascita
                </Label>
                <Input
                  id="dataNascita"
                  type="date"
                  className="h-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  {...register("dataNascita")}
                />
              </div>

              {/* Email */}
              <div className="col-span-2 space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-medium text-slate-500"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="h-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  {...register("email", { required: "Email obbligatoria" })}
                />
                {errors.email?.message && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Telefono */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="telefono"
                  className="text-xs font-medium text-slate-500"
                >
                  Telefono
                </Label>
                <Input
                  id="telefono"
                  className="h-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  {...register("telefono")}
                />
              </div>

              {/* Città */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="citta"
                  className="text-xs font-medium text-slate-500"
                >
                  Città
                </Label>
                <Input
                  id="citta"
                  className="h-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  {...register("citta")}
                />
              </div>
            </div>
          </div>

          {/* FOOTER: Azioni */}
          <div className="p-6 pt-2 pb-6 flex justify-end gap-2 bg-white">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Annulla
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="h-9 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
              disabled={!canSubmit}
            >
              {profile.updateMutation.isPending
                ? "Salvataggio…"
                : "Salva Modifiche"}
            </Button>
          </div>
        </form>

        {profile.updateMutation.isError && (
          <div className="px-6 pb-6 -mt-2 text-xs text-destructive">
            {profile.updateMutation.error.message}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
