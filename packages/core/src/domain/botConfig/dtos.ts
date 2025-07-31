// packages/core/src/domain/botConfig/dtos.ts

import { KommoCustomFieldExistence } from "@clinickeys-agents/core/application/services";

/**
 * Enum para los tipos de bot config.
 */
export enum BotConfigType {
  NotificationBot = "notificationBot",
  ChatBot = "chatBot",
}

/**
 * DTO para la configuración de un Bot.
 * Representa directamente los ítems almacenados en DynamoDB (BotConfig table).
 *
 *  PK → "CLINIC#<clinicSource>#<clinicId>"
 *  SK → "BOT_CONFIG#<botConfigType>#<botConfigId>"
 */
export interface BotConfigDTO {
  // =======================
  // Claves primarias (Dynamo)
  // =======================
  /** Partition Key */
  pk: string; // "CLINIC#<clinicSource>#<clinicId>"
  /** Sort Key */
  sk: string; // "BOT_CONFIG#<botConfigType>#<botConfigId>"

  /** Shard bucket (hash(botConfigId) % N) */
  bucket: number;

  // =======================
  // Identidad y multi‑tenant
  // =======================
  botConfigId: string;                // UUID v4 único global
  botConfigType: BotConfigType;       // "notificationBot" | "chatBot"
  clinicSource: string;               // Ej. "legacy", "v2"
  clinicId: number;                   // ID en el sistema clínico correspondiente
  superClinicId: number;              // ID de la super‑clínica

  // =======================
  // Datos de CRM Kommo
  // =======================
  kommoSubdomain: string;             // Ej. "clinicA.kommo.com"
  kommo: {
    subdomain: string;
    longLivedToken: string;
    responsibleUserId: string;
    salesbotId: number;
  };

  // =======================
  // Configuración de OpenAI (obligatoria)
  // =======================
  openai: {
    apiKey: string;
    assistants?: {
      [key: string]: string;
    };
  };

  // =======================
  // Configuración regional
  // =======================
  defaultCountry: string;             // ISO 3166‑1 alpha‑2
  timezone: string;                   // IANA TZ, ej. "America/Lima"

  // =======================
  // Metadatos de presentación
  // =======================
  name: string;                       // Nombre legible del bot
  description: string;                // Descripción (Markdown permitido)

  // =======================
  // Estado lógico
  // =======================
  isEnabled?: boolean;                // ON/OFF manual

  // =======================
  // Perfil de campos personalizados
  // =======================
  fieldsProfile: string;              // Ej. "default_kommo_profile"

  // =======================
  // Auditoría
  // =======================
  createdAt: number;                  // epoch millis
  updatedAt: number;                  // epoch millis

  // =======================
  // Resto de información (flexible)
  // =======================
  placeholders: Record<string, any>;
}

/**
 * DTO enriquecido para UI / API (agrega campos calculados).
 */
export interface BotConfigEnrichedDTO extends BotConfigDTO {
  kommo_leads_custom_fields: KommoCustomFieldExistence[];
  is_ready: boolean;
}
