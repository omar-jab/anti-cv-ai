import { google } from "@ai-sdk/google";
import { generateObject, tool } from "ai";
import { z } from "zod";

/* =========================
   Schemi
========================= */

const DomandaSchema = z.object({
  question: z.string().describe("Domanda"),
  reason: z
    .string()
    .describe("Motivazione dietro alla proposta di questa domanda"),
});

const DomandeSchema = z.object({
  domande: z.array(DomandaSchema).describe("Lista delle domande"),
});

/* =========================
   Tool
========================= */

export const generateQuestions = tool({
  name: "generate-questions",
  description:
    "Genera domande approfondite per raccogliere più informazioni sulla persona dell’utente",
  inputSchema: z.object({
    context: z
      .string()
      .describe("Informazioni attuali disponibili sull'utente"),
  }),

  execute: async ({ context }) => {
    const { object } = await generateObject({
      model: google("gemini-3-pro-preview"),
      providerOptions: {
        google: {
          thinkingConfig: { thinkingLevel: "low" },
        },
      },
      schema: DomandeSchema,
      prompt: `Genera 10 domande basandoti su queste informazioni:\n${context}`,
      system: `
        Sei un agente esperto nella formulazione di domande esplorative e indirette.

        Il tuo obiettivo è:
        - raccogliere più informazioni possibili sull'utente
        - capire come pensa, cosa lo motiva e cosa lo distingue
        - NON fare domande banali o troppo dirette

        Le domande devono sembrare naturali e stimolanti.

        Esempio:
        Input: "Faccio lo sviluppatore web"
        Output (domande):
        - A quali problemi ti trovi più spesso davanti quando lavori?
        - Cosa ti annoia davvero del tuo lavoro?
        - Quale tecnologia ti incuriosisce ma non hai ancora avuto il coraggio di usare?

        Altro esempio:
        Input: "Faccio il cuoco"
        Output:
        - Qual è un piatto che tutti pensano tu sappia fare ma in realtà eviti?
        - Cucini anche quando non devi o solo per lavoro?
        - Cosa ti stressa di più in una cucina professionale?
      `,
    });

    return object;
  },
});
