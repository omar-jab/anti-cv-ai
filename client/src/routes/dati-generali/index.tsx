import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import AvatarGenerator from "@/components/avatar/avatar-generator";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/use-profile";

type PersonaFormData = {
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
    citta: string;
    dataNascita: string;
    handle?: string;
    immagine: FileList;
};

export default function PersonaPage() {
    const { profile, updateMutation, isLoaded, isSignedIn } = useProfile();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<PersonaFormData>();

    // Carica i dati del profilo nel form quando sono disponibili
    useEffect(() => {
        if (profile) {
            reset({
                nome: profile.firstName || "",
                cognome: profile.lastName || "",
                email: profile.email || "",
                telefono: profile.phone || "",
                citta: profile.city || "",
                dataNascita: profile.birthDate || "",
                handle: profile.handle || "",
            });
            if (profile.imageUrl) {
                setImagePreview(profile.imageUrl);
            }
        }
    }, [profile, reset]);

    const onSubmit = async (data: PersonaFormData) => {
        if (!isSignedIn) return;

        try {
            await updateMutation.mutateAsync({
                firstName: data.nome,
                lastName: data.cognome,
                email: data.email,
                phone: data.telefono || undefined,
                city: data.citta || undefined,
                birthDate: data.dataNascita || undefined,
                handle: data.handle || undefined,
                image: data.immagine?.[0] || null,
            });
        } catch (error) {
            console.error("Error updating profile:", error);
        }
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

                        {/* Handle */}
                        <div className="space-y-2">
                            <Label htmlFor="handle">Handle</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-neutral-500">@</span>
                                <Input
                                    id="handle"
                                    placeholder="username"
                                    {...register("handle", {
                                        validate: (value) => {
                                            if (!value || value.trim() === "") {
                                                return true; // Opzionale
                                            }
                                            if (!/^[a-z0-9._]+$/i.test(value)) {
                                                return "Solo lettere, numeri, punti e underscore";
                                            }
                                            if (value.length < 3) {
                                                return "Minimo 3 caratteri";
                                            }
                                            if (value.length > 30) {
                                                return "Massimo 30 caratteri";
                                            }
                                            return true;
                                        },
                                    })}
                                    aria-invalid={!!errors.handle}
                                    className="rounded-md flex-1"
                                />
                            </div>
                            {errors.handle && (
                                <p className="text-xs text-red-600 mt-1">
                                    {errors.handle.message}
                                </p>
                            )}
                            <p className="text-xs text-neutral-500">
                                Il tuo handle pubblico (es. @username) per la preview
                            </p>
                        </div>

                        {/* Upload immagine e Preview */}
                        <div className="space-y-4 pt-2">
                            <Label htmlFor="immagine">Immagine Profilo</Label>
                            <div className="flex items-start gap-4">
                                <div className="size-24 object-cover rounded-md border border-neutral-200 shrink-0 bg-neutral-50 overflow-hidden">
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

                    <Button
                        type="submit"
                        className="w-full mt-8 rounded-md"
                        disabled={updateMutation.isPending || !isLoaded || !isSignedIn}
                    >
                        {updateMutation.isPending ? "Salvataggio..." : "Salva Profilo"}
                    </Button>
                    {updateMutation.isError && (
                        <p className="text-xs text-red-600 mt-2">
                            {updateMutation.error?.message || "Errore nel salvataggio"}
                        </p>
                    )}
                    {updateMutation.isSuccess && (
                        <p className="text-xs text-green-600 mt-2">Profilo salvato con successo</p>
                    )}
                </form>
            </div>

            {/* Colonna Preview/Avatar (Nativa, non rumorosa) */}
            <div className="w-96 p-8 border-l border-neutral-100 bg-neutral-50 shrink-0">
                <h2 className="text-lg font-medium tracking-tight mb-6">
                    Strumenti AI
                </h2>
                <AvatarGenerator />
            </div>
        </div>
    );
}
