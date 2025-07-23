// packages/frontend/src/app/types/clinic.ts

import { z } from "zod";

/* ──────────────────────────────────────────────────────────────────────────
 * Dominio
 * ──────────────────────────────────────────────────────────────────────── */

export interface KommoLeadCustomField {
  /** Nombre del campo en Kommo */
  field_name: string;
  /** Indica si el campo existe en la cuenta Kommo */
  exists: boolean;
}

export interface Clinic {
  /** ID de la clínica */
  clinicId: string;
  /** Nombre visible de la clínica */
  name: string;
  /** Subdominio de la cuenta en Kommo */
  subdomain: string;
  /** Zona horaria IANA, p. ej. “Europe/Madrid” */
  timezone: string;
  /** Código ISO-3166-1 alfa-2 del país por defecto, p. ej. “ES” */
  default_country: string;
  /** ID del Salesbot en Kommo */
  id_salesbot: number;
  /** Clave de API para integraciones internas */
  api_key: string;
  /**
   * Campo oculto para el UI; el frontend siempre envía
   * el valor fijo “default_kommo_profile”
   */
  fields_profile: string;
  /** Campos personalizados de leads en Kommo */
  kommo_leads_custom_fields: KommoLeadCustomField[];
  /** Indica si la clínica está lista para usar */
  is_ready: boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Esquema Zod
 * ────────────────────────────────────────────────────────────────────────── */

export const clinicSchema = z.object({
  clinicId: z
    .string()
    .trim()
    .min(1, { message: "El ID de la clínica es obligatorio" }),

  name: z
    .string()
    .trim()
    .min(1, { message: "El nombre es obligatorio" }),

  subdomain: z
    .string()
    .trim()
    .min(1, { message: "El subdominio es obligatorio" }),

  timezone: z
    .string()
    .trim()
    .min(1, { message: "La zona horaria es obligatoria" }),

  default_country: z
    .string()
    .trim()
    .length(2, { message: "Usa el código ISO-3166-1 (p. ej. ES)" }),

  id_salesbot: z
    .coerce.number()
    .int()
    .positive({ message: "Debe ser un número positivo" }),

  api_key: z
    .string()
    .trim()
    .min(1, { message: "El token de kommo es obligatorio" }),

  fields_profile: z
    .string()
    .default("default_kommo_profile"),

  entity: z
    .string()
    .default("BOT_CONFIG"),
});

/* Derivado útil para formularios */
export type ClinicInput = z.infer<typeof clinicSchema>;
