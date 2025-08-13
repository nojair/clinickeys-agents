// /features/bot-configs/model/formSchemas.ts

import { z } from "zod";

/**
 * Esquemas de validación para los formularios de BotConfig
 */
export const botConfigTypeSchema = z.enum(["notificationBot", "chatBot"]);

export const baseBotConfigSchema = z.object({
  description: z.string().trim().optional(),
  kommoSubdomain: z.string().min(1, "Subdominio Kommo requerido"),
  kommoLongLivedToken: z.string().min(1, "Token Kommo requerido"),
  kommoResponsibleUserId: z.number().min(1, "ID Responsable Kommo requerido"),
  kommoSalesbotId: z.string().min(1, "ID Salesbot Kommo requerido"),
  defaultCountry: z.string().min(1, "País requerido"),
  timezone: z.string().min(1, "Zona horaria requerida"),
  isEnabled: z.boolean(),
  fieldsProfile: z.literal("default_kommo_profile"),
  clinicSource: z.literal("legacy"),
  clinicId: z.union([z.string(), z.number()]),
  superClinicId: z.union([z.string(), z.number()]),
});

export const createBotConfigSchema = baseBotConfigSchema.extend({
  botConfigType: botConfigTypeSchema,
  openaiApikey: z.string().optional().or(z.literal("")),
  placeholders: z.record(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.botConfigType === "chatBot") {
    if (!data.openaiApikey || data.openaiApikey.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["openaiApikey"],
        message: "Token OpenAI es obligatorio para chatBot",
      });
    }
  }
});

export const updateBotConfigSchema = baseBotConfigSchema.partial().extend({
  botConfigType: botConfigTypeSchema,
  openaiApikey: z.string().optional(),
  assistants: z.record(z.string(), z.string()).optional(),
});

export const placeholderSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string().optional(),
});

export const placeholdersArraySchema = z.array(placeholderSchema);
