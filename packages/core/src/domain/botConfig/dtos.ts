// packages/core/src/domain/botConfig/dtos.ts

import { KommoLeadCustomField } from "@clinickeys-agents/core/infrastructure/integrations/kommo/types";

/**
 * DTO para la configuración de un Bot.
 * Corresponde a los ítems almacenados en DynamoDB.
 */
export interface BotConfigDTO {
  /** Partition Key → "CLINIC#<clinic_source>#<clinic_id>" */
  pk: string;
  /** Sort Key       → "BOT_CONFIG#<bot_config_id>" */
  sk: string;

  /** Shard bucket (hash(bot_config_id) % N) */
  bucket: number;

  // Identidad y multi‑tenant
  bot_config_id: string;   // UUID v4, único global
  clinic_source: string;   // "legacy", "v2", ...
  clinic_id: number;       // ID en el sistema correspondiente

  // Datos de CRM (multiplataforma)
  crm_type: "kommo" | "hubspot" | string; // Permite nuevos CRMs
  crm_subdomain?: string;  // ej. "clinicA.kommo.com"
  crm_api_key: string;

  // Datos específicos de Kommo
  kommo_salesbot_id?: string;     // ID del salesbot de Kommo, si aplica

  // Configuración regional
  default_country: string; // ISO 3166‑1 alpha‑2, ej. "PE"
  timezone: string;        // IANA TZ, ej. "America/Lima"

  // Metadatos de presentación
  name: string;            // Nombre legible del bot
  description: string;     // Descripción libre (Markdown permitido)

  // Estado lógico (se puede activar más adelante)
  isActive?: boolean;
  
  // Perfil de campos personalizados
  fields_profile: string; // Perfil de campos personalizados, ej. "default_esp"

  // Auditoría
  createdAt: number;       // epoch millis
  updatedAt: number;       // epoch millis
}

/**
 * Composición de llaves:
 *
 *  PK = `CLINIC#${clinic_source}#${clinic_id}` // agrupa por clínica + sistema
 *  SK = `BOT_CONFIG#${bot_config_id}`           // ordena por bot dentro de la clínica
 */

/**
 * DTO enriquecido para respuestas de API / UI.
 */
export interface BotConfigEnrichedDTO extends BotConfigDTO {
  kommo_leads_custom_fields: KommoLeadCustomField[];
  is_ready: boolean;
}
