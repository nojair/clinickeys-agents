// packages/core/src/application/dtos/LeadQueueMessageDTO.ts

import { KommoLeadEventDTO } from "./KommoLeadEventDTO";

/**
 * DTO que viaja por la cola FIFO `chatbotQueue`.
 * Contiene la información mínima que el *processor* necesita para continuar
 * con la conversación, desacoplada del formato original del webhook.
 */
export interface LeadQueueMessageDTO {
  /**
   * Payload de Kommo previamente normalizado.
   * Mantenerlo anidado facilita evolucionar el contrato sin romper el parser
   * del *processor*.
   */
  kommo: KommoLeadEventDTO;

  /**
   * Parámetros dinámicos que llegan en la ruta del endpoint (ej. botConfigId,
   * clinicSource, clinicId). Se propagan para que el *processor* pueda cargar
   * la configuración de la clínica correspondiente.
   */
  pathParameters: Record<string, string>;

  /** Marca de tiempo (ISO‑8601) en que se publicó el mensaje en cola. */
  enqueuedAt: string;
}
