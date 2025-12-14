import { z } from "zod";

export const CV_GENERATOR_SYSTEM_PROMPT = `
    <system_role>
    Sei un CV Extraction Engine specializzato.
    Il tuo input è un insieme eterogeneo di memorie, storie, tratti di personalità e dati sparsi di un utente (il suo "Anti-Portfolio").
    Il tuo output deve essere ESCLUSIVAMENTE un oggetto JSON valido che rispetta rigorosamente lo schema CVSchema fornito.

    Il tuo compito è trasformare narrazioni ed esperienze vissute in un Curriculum Vitae professionale, strutturato e ad alto impatto.
    </system_role>

    <target_schema>
    Devi generare un JSON che rispetta questa interfaccia TypeScript:

    interface CVSchema {
      personalInfo: {
        fullName: string; // Se non c'è, usa "Nome Cognome" o placeholder
        role: string; // Inferiscilo dalle memorie (es. "Senior Frontend Dev")
        email: string; // Se manca: "email@placeholder.com"
        location?: string;
        summary?: string; // La "Bio" distillata dalla personalità
      };
      experience: Array<{
        id: string; // Genera un ID univoco (es. "job_1")
        role: string;
        company: string; // Se manca, usa "Progetto Confidenziale" o il nome del progetto
        location?: string;
        startDate: string; // Formato "YYYY-MM" o "YYYY". Stima se necessario.
        endDate?: string; // Lascia undefined se è il lavoro corrente
        description: string; // Punti elenco separati da newline
        tags?: string[]; // Tecnologie e skill usate in questo ruolo
      }>;
      education: Array<{
        id: string;
        degree: string;
        institution: string;
        year: string;
      }>;
      skills: string[]; // Lista piatta di tutte le hard skill trovate
      languages?: Array<{ name: string; level: string }>;
    }
    </target_schema>

    <extraction_rules>
    ## 1. TRADUZIONE DA "MEMORIA" A "CV"
    Le memorie sono scritte in linguaggio naturale/narrativo. Tu devi convertirle in linguaggio business professionale, MANTENENDO però la verità dell'Anti-Portfolio.

    *   **Input:** "Quella volta che il sito è crollato durante il Black Friday e ho dovuto riscrivere la cache in Rust alle 3 di notte."
    *   **Output (Description):** "Gestione incidenti critici ad alto traffico (Black Friday). Riprogettazione d'emergenza del layer di caching utilizzando Rust, ripristinando la stabilità del servizio sotto carico."

    ## 2. GESTIONE DELLE DATE E DEI BUCHI
    *   Cerca riferimenti temporali nelle memorie ("l'anno scorso", "nel 2020", "dopo la laurea").
    *   Se le date esatte mancano, fai una stima logica basata sulla sequenza degli eventi per mantenere un ordine cronologico coerente.
    *   Se non puoi stimare, usa solo l'anno.

    ## 3. INFERENZA DELLE SKILLS
    *   Estrai le skill esplicite (es. "Ho usato React").
    *   Inferisci le skill implicite:
        *   "Ho gestito il team" -> Leadership, Mentoring.
        *   "Ho disegnato i pulsanti" -> UI/UX Design, Figma.
        *   "Ho ottimizzato le query" -> SQL, Performance Tuning.

    ## 4. IL "SUMMARY" (PERSONALITÀ)
    Il campo \`personalInfo.summary\` è fondamentale. Non scrivere "Sviluppatore motivato".
    Usa i dati sulla PERSONALITÀ per scrivere 2-3 frasi che catturano chi è veramente.
    *   *Esempio:* "Ingegnere del software ossessionato dalla performance e dalla semplicità. Specializzato nel riparare debiti tecnici complessi e nel guidare team attraverso fasi di scaling caotico."

    ## 5. FORMATTAZIONE DESCRIZIONE
    Il campo \`experience.description\` deve usare i newline (\n) per creare una lista puntata visiva. Non usare tag HTML.
    Includi:
    - Cosa è stato fatto.
    - L'impatto/Risultato (se presente nelle memorie).
    - Lo stack tecnologico o metodologico chiave.
    </extraction_rules>

    <data_integrity>
    - NON inventare aziende o lauree se non menzionate. Se manca l'educazione, restituisci array vuoto.
    - NON inventare contatti (telefono/email) reali. Usa placeholder generici se necessario, ma preferibilmente lascia vuoto se opzionale.
    - Se una memoria parla di un "progetto personale" rilevante, inseriscilo sotto \`experience\` come se fosse un lavoro freelance.
    </data_integrity>

    <output_format>
    Restituisci SOLO il JSON puro. Nessun blocco di codice markdown (\`\`\`), nessun commento prima o dopo.
    </output_format>
  `.trim();

/**
 * Regole data (semplici ma utili):
 * - startDate: "YYYY-MM" oppure "YYYY" (es: "2024-09" o "2024")
 * - endDate: se assente = "Presente"
 */
const YearOrYearMonth = z
  .string()
  .regex(/^\d{4}(-\d{2})?$/, 'Formato valido: "YYYY" oppure "YYYY-MM"');

/**
 * CVSchema (Zod)
 * - Struttura pensata per il tuo builder, mantenendo tutto semplice.
 */
export const CVSchemaZ = z.object({
  personalInfo: z.object({
    fullName: z
      .string()
      .min(1, "fullName è obbligatorio")
      .describe("Nome completo (es: 'Omar Rossi')"),

    role: z
      .string()
      .min(1, "role è obbligatorio")
      .describe("Ruolo professionale (es: 'Web Developer')"),

    email: z.string().email("Email non valida").describe("Email principale"),

    phone: z.string().min(1).optional().describe("Telefono (opzionale)"),

    location: z
      .string()
      .min(1)
      .optional()
      .describe("Località (opzionale, es: 'Milano, IT')"),

    website: z
      .string()
      .url("website deve essere un URL valido")
      .optional()
      .describe("Sito personale/portfolio (opzionale)"),

    avatarUrl: z
      .string()
      .url("avatarUrl deve essere un URL valido")
      .optional()
      .describe("URL avatar (opzionale)"),

    summary: z
      .string()
      .min(1)
      .optional()
      .describe("Bio breve / summary (opzionale)"),
  }),

  experience: z
    .array(
      z.object({
        id: z
          .string()
          .min(1, "id è obbligatorio")
          .describe("ID univoco dell’esperienza (uuid o stringa)"),

        role: z
          .string()
          .min(1, "role è obbligatorio")
          .describe("Ruolo ricoperto"),

        company: z
          .string()
          .min(1, "company è obbligatorio")
          .describe("Nome azienda"),

        location: z.string().min(1).optional().describe("Località (opzionale)"),

        startDate: YearOrYearMonth.describe('Data inizio: "YYYY" o "YYYY-MM"'),

        endDate: YearOrYearMonth.optional().describe(
          'Data fine: "YYYY" o "YYYY-MM". Se assente = Presente',
        ),

        description: z
          .string()
          .min(1, "description è obbligatorio")
          .describe("Descrizione (supporta newline)"),

        tags: z
          .array(z.string().min(1))
          .optional()
          .describe("Tecnologie / tag (opzionale)"),
      }),
    )
    .describe("Lista esperienze lavorative"),

  education: z
    .array(
      z.object({
        id: z.string().min(1).describe("ID univoco formazione"),
        degree: z.string().min(1).describe("Titolo di studio (es: 'Diploma')"),
        institution: z.string().min(1).describe("Istituto / università"),
        year: z
          .string()
          .regex(/^\d{4}$/, 'year deve essere "YYYY"')
          .describe('Anno (solo "YYYY")'),
      }),
    )
    .describe("Lista formazione"),

  skills: z
    .array(z.string().min(1))
    .describe("Lista skill (stringhe semplici)"),

  languages: z
    .array(
      z.object({
        name: z.string().min(1).describe("Lingua (es: 'Italiano')"),
        level: z.string().min(1).describe("Livello (es: 'B2', 'Native')"),
      }),
    )
    .optional()
    .describe("Lingue (opzionale)"),
});

export type CVSchema = z.infer<typeof CVSchemaZ>;

import { generateObject } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { buildUserMemoriesBlock } from "../lib/utils";
import type { UserMemoryItem } from "./personality-deep-agent";

/**
 * Genera un CV a partire dalle memorie e dalla personalità dell'utente.
 */
export async function generateCV(params: {
  memories: UserMemoryItem[];
  personality: string;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    imageUrl?: string | null;
  } | null;
}) {
  const profileBlock = params.profile
    ? `
<user_profile>
Nome: ${params.profile.firstName ?? "N/A"}
Cognome: ${params.profile.lastName ?? "N/A"}
Email: ${params.profile.email ?? "N/A"}
Telefono: ${params.profile.phone ?? "N/A"}
Città: ${params.profile.city ?? "N/A"}
Avatar URL: ${params.profile.imageUrl ?? "N/A"}
</user_profile>
`
    : "";

  const messages = [
    {
      role: "user" as const,
      content: [
        "Genera un CV professionale basato sulle memorie e sulla personalità dell'utente.",
        "Usa i dati del profilo se disponibili per compilare i campi personalInfo.",
        "",
        buildUserMemoriesBlock(params.memories),
        "",
        "<personality>",
        params.personality,
        "</personality>",
        profileBlock,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  const { object } = await generateObject({
    model: openrouter("google/gemini-3-pro-preview"),
    system: CV_GENERATOR_SYSTEM_PROMPT,
    schema: CVSchemaZ,
    messages,
  });

  return object;
}
