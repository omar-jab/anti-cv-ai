import { z } from "zod";

export const HandleSchema = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.startsWith("@") ? value.slice(1) : value))
  .transform((value) => value.trim())
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9._]+$/, "Handle contains invalid characters"),
  )
  .superRefine((value, ctx) => {
    if (value.startsWith(".") || value.endsWith(".")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Handle cannot start or end with '.'",
      });
    }
    if (value.includes("..")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Handle cannot contain consecutive '.'",
      });
    }
  });

export function normalizeHandle(raw: string) {
  const parsed = HandleSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
