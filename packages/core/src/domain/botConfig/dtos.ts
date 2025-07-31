// packages/core/src/domain/botConfig/dtos.ts

import { KommoCustomFieldExistence } from "@clinickeys-agents/core/application/services";

/**
 * DTO para la configuración de un Bot.
 * Corresponde a los ítems almacenados en DynamoDB.
 */
export interface BotConfigDTO {
  /** Partition Key → "CLINIC#<clinicSource>#<clinicId>" */
  pk: string;
  /** Sort Key       → "BOT_CONFIG#<botConfigId>" */
  sk: string;

  /** Shard bucket (hash(botConfigId) % N) */
  bucket: number;

  // Identidad y multi‑tenant
  botConfigId: string;   // UUID v4, único global
  botConfigType: string; // "notification", "chat", ...
  clinicSource: string;  // "legacy", "v2", ...
  clinicId: number;      // ID en el sistema correspondiente
  superClinicId: number;

  // Datos de CRM (multiplataforma)
  kommoSubdomain: string;  // ej. "clinicA.kommo.com"
  
  // Datos específicos de Kommo
  kommo: {
    subdomain: string;  // ej. "clinicA.kommo.com"
    longLivedToken: string;
    responsibleUserId: string;
    salesbotId: number;     // ID del salesbot de Kommo, si aplica
  }

  // Configuración de OpenAI
  openai?: {
    /* OPENAI apiKey */
    apiKey: string;
    /** Asistentes OpenAI registrados en la cuenta */
    assistants?: {
      /** Otros asistentes y sus IDs pueden agregarse aquí si es necesario */
      [key: string]: string;
    };
  };

  // Configuración regional
  defaultCountry: string; // ISO 3166‑1 alpha‑2, ej. "PE"
  timezone: string;        // IANA TZ, ej. "America/Lima"

  // Metadatos de presentación
  name: string;            // Nombre legible del bot
  description: string;     // Descripción libre (Markdown permitido)

  // Estado lógico (se puede activar más adelante)
  isEnabled?: boolean;

  // Perfil de campos personalizados
  fieldsProfile: string; // Perfil de campos personalizados, ej. "default_kommo_profile"

  // Auditoría
  createdAt: number;       // epoch millis
  updatedAt: number;       // epoch millis

  placeholders: (Record<string, any>);
}

/**
 * Composición de llaves:
 *
 *  PK = `CLINIC#${clinicSource}#${clinicId}` // agrupa por clínica + sistema
 *  SK = `BOT_CONFIG#${botConfigId}`           // ordena por bot dentro de la clínica
 */

/**
 * DTO enriquecido para respuestas de API / UI.
 */
export interface BotConfigEnrichedDTO extends BotConfigDTO {
  kommo_leads_custom_fields: KommoCustomFieldExistence[];
  is_ready: boolean;
}
