import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import AvatarGenerator from "@/components/avatar/avatar-generator";
import { Separator } from "@/components/ui/separator"; // Assumo l'uso di un Separator sottile

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

  // La sezione di sinistra è dedicata all'input; deve essere pulita e focalizzata.
  return (
    <div className="flex w-full h-full min-h-screen bg-white">
      {/* Colonna Input Dati (Focus) */}
      <div className="flex-1 max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-6">Modifica Profilo</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Sezione: Generalità */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium tracking-tight">Generalità</h2>
            <Separator className="bg-neutral-100" />

            {/* Nome e Cognome */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  {...register("nome", { required: "Nome richiesto" })}
                  aria-invalid={!!errors.nome}
                  className="rounded-md" // Bordi leggermente arrotondati
                />
                {errors.nome && (
                  <p className="text-xs text-red-600 mt-1">
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
                  className="rounded-md"
                />
                {errors.cognome && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.cognome.message}
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
                className="rounded-md"
              />
              {errors.dataNascita && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.dataNascita.message}
                </p>
              )}
            </div>

            {/* Upload immagine e Preview */}
            <div className="space-y-4 pt-2">
              <Label htmlFor="immagine">Immagine Profilo</Label>
              <div className="flex items-start gap-4">
                <div className="size-24 object-cover rounded-md border border-neutral-200 flex-shrink-0 bg-neutral-50 overflow-hidden">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                      Nessuna Immagine
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    id="immagine"
                    type="file"
                    accept="image/*"
                    {...register("immagine", {
                      required: "Immagine richiesta",
                    })}
                    onChange={(e) => {
                      register("immagine").onChange(e);
                      handleImageChange(e);
                    }}
                    aria-invalid={!!errors.immagine}
                    className="rounded-md"
                  />
                  {errors.immagine && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.immagine.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sezione: Dati di contatto */}
          <div className="space-y-6 pt-4">
            <h2 className="text-lg font-medium tracking-tight">
              Dati di Contatto
            </h2>
            <Separator className="bg-neutral-100" />

            <div className="space-y-4">
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
                  className="rounded-md"
                />
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1">
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
                  className="rounded-md"
                />
                {errors.telefono && (
                  <p className="text-xs text-red-600 mt-1">
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
                  className="rounded-md"
                />
                {errors.citta && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.citta.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full mt-8 rounded-md">
            Salva Profilo
          </Button>
        </form>
      </div>

      {/* Colonna Preview/Avatar (Nativa, non rumorosa) */}
      <div className="w-96 p-8 border-l border-neutral-100 bg-neutral-50 flex-shrink-0">
        <h2 className="text-lg font-medium tracking-tight mb-6">
          Strumenti AI
        </h2>
        <AvatarGenerator />
      </div>
    </div>
  );
}
