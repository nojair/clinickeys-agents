// packages/core/src/application/ports/MessageQueuePort.ts

import { LeadQueueMessageDTO } from "@clinickeys-agents/core/domain/kommo";

/**
 * Outbound Port que abstrae el mecanismo de publicación de mensajes.
 * La capa de Aplicación depende **solo** de esta interfaz; la implementación
 * concreta (SQS, SNS, Kafka, etc.) vive en Infrastructure.
 */
export interface MessageQueuePort {
  /**
   * Publica un mensaje en la cola/bus.
   *
   * @param message   Payload listo para serializar (LeadQueueMessageDTO).
   * @param options.groupId          Clave de agrupación (FIFO) para garantizar orden.
   * @param options.deduplicationId  ID de deduplicación para colas FIFO.
   */
  send(
    message: LeadQueueMessageDTO,
    options: {
      groupId: string;
      deduplicationId: string;
    }
  ): Promise<void>;
}
