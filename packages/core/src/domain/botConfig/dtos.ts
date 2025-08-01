import { KommoCustomFieldExistence } from "@clinickeys-agents/core/application/services";

export enum BotConfigType {
  NotificationBot = "notificationBot",
  ChatBot = "chatBot",
}

// ========== DTOs para CREACIÓN de Bots ==========

export interface CreateChatBotConfigDTO {
  botConfigType: BotConfigType.ChatBot;
  name: string;
  kommo: {
    subdomain: string;
    longLivedToken: string;
    responsibleUserId: string;
    salesbotId: number;
  };
  kommoSubdomain: string;
  clinicSource: string;
  clinicId: number;
  superClinicId: number;
  openai: {
    apiKey: string;
  };
  defaultCountry: string;
  timezone: string;
  description?: string;
  isEnabled?: boolean;
  fieldsProfile: string;
  placeholders: Record<string, any>;
}

export interface CreateNotificationBotConfigDTO {
  botConfigType: BotConfigType.NotificationBot;
  name: string;
  kommo: {
    subdomain: string;
    longLivedToken: string;
    responsibleUserId: string;
    salesbotId: number;
  };
  kommoSubdomain: string;
  clinicSource: string;
  clinicId: number;
  superClinicId: number;
  defaultCountry: string;
  timezone: string;
  description?: string;
  isEnabled?: boolean;
  fieldsProfile: string;
  // NOTA: No requiere openai ni placeholders
}

// ========== DTOs para LECTURA (persistidos en Dynamo) ==========

export interface BotConfigDTO {
  pk: string;
  sk: string;
  bucket: number;
  botConfigId: string;
  botConfigType: BotConfigType;
  clinicSource: string;
  clinicId: number;
  superClinicId: number;
  kommoSubdomain: string;
  kommo: {
    subdomain: string;
    longLivedToken: string;
    responsibleUserId: string;
    salesbotId: number;
  };
  openai?: {
    apiKey: string;
    assistants?: {
      [key: string]: string;
    };
  };
  defaultCountry: string;
  timezone: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  fieldsProfile: string;
  createdAt: number;
  updatedAt: number;
  placeholders?: Record<string, any>;
}

export interface BotConfigEnrichedDTO extends BotConfigDTO {
  kommo_leads_custom_fields: KommoCustomFieldExistence[];
  is_ready: boolean;
}
