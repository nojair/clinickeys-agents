// /features/bot-configs/model/formSchemas.ts

import { z } from "zod";

/**
 * Esquemas de validación para los formularios de BotConfig
 */

export const botConfigTypeSchema = z.enum(["notificationBot", "chatBot"]);

export const baseBotConfigSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().min(1, "Descripción requerida"),
  kommoSubdomain: z.string().min(1, "Subdominio Kommo requerido"),
  kommoLongLivedToken: z.string().min(1, "Token Kommo requerido"),
  kommoResponsibleUserId: z.string().min(1, "ID Responsable Kommo requerido"),
  kommoSalesbotId: z.string().min(1, "ID Salesbot Kommo requerido"),
  defaultCountry: z.string().min(1, "País requerido"),
  timezone: z.string().min(1, "Zona horaria requerida"),
  isEnabled: z.boolean(),
  fieldsProfile: z.literal("kommo_profile"),
  clinicSource: z.literal("legacy"),
  clinicId: z.union([z.string(), z.number()]),
  superClinicId: z.union([z.string(), z.number()]),
});

export const createBotConfigSchema = baseBotConfigSchema.extend({
  botConfigType: botConfigTypeSchema,
  openaiToken: z.string().min(1, "Token OpenAI requerido").optional(), // solo chatBot
  placeholders: z.record(z.string()).optional(), // solo chatBot
}).superRefine((data, ctx) => {
  if (data.botConfigType === "chatBot") {
    if (!data.openaiToken || data.openaiToken.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["openaiToken"],
        message: "Token OpenAI es obligatorio para chatBot",
      });
    }
  }
});

export const updateBotConfigSchema = baseBotConfigSchema.partial().extend({
  openaiToken: z.string().optional(), // solo chatBot
});

export const placeholderSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string().optional(),
});

export const placeholdersArraySchema = z.array(placeholderSchema);
