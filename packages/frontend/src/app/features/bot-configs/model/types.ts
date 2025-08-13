// /features/bot-configs/model/types.ts

import type { BotConfigType } from "@/app/entities/bot-config/types";

/**
 * Tipos auxiliares y contratos para payloads y placeholders
 */

export interface CreateBotConfigPayload {
  botConfigType: BotConfigType;
  description: string;
  kommoSubdomain: string;
  kommoLongLivedToken: string;
  kommoResponsibleUserId: string;
  kommoSalesbotId: string;
  openaiApikey?: string; // Obligatorio si es chatBot
  defaultCountry: string;
  timezone: string;
  isEnabled: boolean;
  fieldsProfile: "default_kommo_profile";
  clinicSource: "legacy";
  clinicId: string | number;
  superClinicId: string | number;
  placeholders?: Record<string, string>; // Solo para chatBot
}

export interface UpdateBotConfigPayload {
  name?: string;
  description?: string;
  kommoSubdomain?: string;
  kommoLongLivedToken?: string;
  kommoResponsibleUserId?: string;
  kommoSalesbotId?: string;
  openaiApikey?: string; // Solo si chatBot
  defaultCountry?: string;
  timezone?: string;
  isEnabled?: boolean;
  clinicId?: string | number;
  superClinicId?: string | number;
  // No permite editar placeholders ni assistantIds
}

export interface Placeholder {
  key: string;     // Clave del placeholder, ej: "doctorName"
  label: string;   // Label descriptivo para el usuario
  value: string;   // Valor por defecto (editable en creación)
}

// Otras entidades y tipos auxiliares, si fueran necesarios para el feature, deben agregarse aquí y estar tipados estrictamente.
