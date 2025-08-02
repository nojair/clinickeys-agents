// /entities/bot-config/types.ts

/**
 * Tipos y entidad central para configuración de bots
 */

export type BotConfigType = "notificationBot" | "chatBot";

export interface BotConfig {
  id: string; // UUID generado por backend
  botConfigType: BotConfigType;
  name: string;
  description: string;
  kommoSubdomain: string;
  kommoLongLivedToken: string;
  kommoResponsibleUserId: string;
  kommoSalesbotId: string;
  openaiToken?: string; // Solo requerido si chatBot
  openaiAssistantIds?: Record<string, string>; // Solo chatBot, solo lectura en edición
  defaultCountry: string;
  timezone: string;
  isEnabled: boolean;
  isReady: boolean; // Solo lectura, calculado backend
  fieldsProfile: "kommo_profile"; // Siempre este valor, solo lectura
  clinicSource: "legacy"; // Siempre este valor, solo lectura
  clinicId: string | number;
  superClinicId: string | number;
  placeholders?: Record<string, string>; // Solo chatBot, solo lectura en edición
  // webhook: string; // No viene del backend, se calcula en el front
}
