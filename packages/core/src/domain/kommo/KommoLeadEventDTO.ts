// packages/core/src/application/dtos/KommoLeadEventDTO.ts

/**
 * DTO que representa el payload *normalizado* que envía Kommo al webhook
 * cuando se crea o actualiza un Lead vía Salesbot.
 * Solo cubre los campos que necesitamos en el dominio; el resto viaja en `raw`.
 */

export interface KommoLeadMeta {
  /** Identificador del Lead dentro de Kommo (string numérico) */
  id: string;
  /** Identificador de la etapa o estado del pipeline */
  statusId: string;
  /** Identificador del pipeline */
  pipelineId: string;
}

export interface KommoLeadsPayload {
  /**
   * Array de leads recién añadidos (Kommo siempre envía un único elemento)
   */
  add: KommoLeadMeta[];
}

export interface KommoAccountMeta {
  /** ID de la cuenta Kommo */
  id: string;
  /** Subdominio de la cuenta (ej. "example" para example.kommo.com) */
  subdomain: string;
}

export interface KommoLeadEventDTO {
  /** Sección `leads` del payload */
  leads: KommoLeadsPayload;
  /** Sección `account` del payload */
  account: KommoAccountMeta;
  /**
   * Payload completo sin procesar, por si algún caso de uso necesita campos
   * adicionales no modelados explícitamente.
   */
  raw: unknown;
}
