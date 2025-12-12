import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

type PersonaFormData = {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  citta: string;
  dataNascita: string;
  immagine: FileList;
};

export default function PersonaPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonaFormData>();

  const onSubmit = (data: PersonaFormData) => {
    console.log(data);
    console.log("File immagine:", data.immagine[0]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full h-full flex">
      <div className="flex-1">
        <div className="p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h2>Generalità</h2>
            </div>
            {/* Nome e Cognome */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  {...register("nome", { required: "Nome richiesto" })}
                  aria-invalid={!!errors.nome}
                />
                {errors.nome && (
                  <p className="text-xs text-destructive">
                    {errors.nome.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cognome">Cognome</Label>
                <Input
                  id="cognome"
                  {...register("cognome", { required: "Cognome richiesto" })}
                  aria-invalid={!!errors.cognome}
                />
                {errors.cognome && (
                  <p className="text-xs text-destructive">
                    {errors.cognome.message}
                  </p>
                )}
              </div>
            </div>

            {/* Dati di contatto */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Dati di contatto</h2>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email", {
                    required: "Email richiesta",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Email non valida",
                    },
                  })}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Numero di telefono</Label>
                <Input
                  id="telefono"
                  type="tel"
                  {...register("telefono", { required: "Numero richiesto" })}
                  aria-invalid={!!errors.telefono}
                />
                {errors.telefono && (
                  <p className="text-xs text-destructive">
                    {errors.telefono.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="citta">Città</Label>
                <Input
                  id="citta"
                  {...register("citta", { required: "Città richiesta" })}
                  aria-invalid={!!errors.citta}
                />
                {errors.citta && (
                  <p className="text-xs text-destructive">
                    {errors.citta.message}
                  </p>
                )}
              </div>
            </div>

            {/* Data di nascita */}
            <div className="space-y-2">
              <Label htmlFor="dataNascita">Data di nascita</Label>
              <Input
                id="dataNascita"
                type="date"
                {...register("dataNascita", {
                  required: "Data di nascita richiesta",
                })}
                aria-invalid={!!errors.dataNascita}
              />
              {errors.dataNascita && (
                <p className="text-xs text-destructive">
                  {errors.dataNascita.message}
                </p>
              )}
            </div>

            {/* Upload immagine */}
            <div className="space-y-2">
              <Label htmlFor="immagine">Immagine</Label>
              <Input
                id="immagine"
                type="file"
                accept="image/*"
                {...register("immagine", { required: "Immagine richiesta" })}
                onChange={(e) => {
                  register("immagine").onChange(e);
                  handleImageChange(e);
                }}
                aria-invalid={!!errors.immagine}
              />
              {errors.immagine && (
                <p className="text-xs text-destructive">
                  {errors.immagine.message}
                </p>
              )}

              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-md border"
                  />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full">
              Salva
            </Button>
          </form>
        </div>
      </div>

      <div className="flex-1 border-l border-l-neutral-100">
        <div className="p-4">
          <div>
            <h2>Preview</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
