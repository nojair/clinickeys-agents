// /shared/lib/zodSchemas.ts

import { z } from "zod";

/**
 * Schemas globales y composables para validaciones comunes en la app
 */

export const requiredString = (message = "Campo requerido") => z.string().min(1, message);
export const emailSchema = z.string().email("Email inválido");
export const uuidSchema = z.string().uuid("Formato UUID inválido");
export const idSchema = z.union([z.string(), z.number()]);
export const boolSchema = z.boolean();
