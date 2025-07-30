// packages/core/src/application/usecases/ProcessLeadWebhookUseCase.ts

import { KommoLeadEventDTO } from "@clinickeys-agents/core/domain/kommo";
import { LeadQueueMessageDTO } from "@clinickeys-agents/core/domain/kommo";
import { Logger } from "@clinickeys-agents/core/infrastructure/external";

/**
 * Caso de uso que transforma el payload entrante del webhook
 * en un mensaje listo para publicarse en la cola FIFO.
 *
 * No conoce detalles de la tecnología de cola; simplemente
 * prepara el {@link LeadQueueMessageDTO} que un adapter externo
 * enviará a SQS (o cualquier otro bus) a través del `MessageQueuePort`.
 */
export class ProcessLeadWebhookUseCase {
  constructor(private readonly logger: typeof Logger) {}

  /**
   * @param kommoEvent   payload del webhook ya normalizado
   * @param pathParams   parámetros de la ruta capturados por API Gateway
   */
  async execute(
    kommoEvent: KommoLeadEventDTO,
    pathParams: Record<string, string | undefined>
  ): Promise<LeadQueueMessageDTO> {
    this.logger.info("Building LeadQueueMessageDTO", { kommoEvent, pathParams });

    // Validación mínima: aseguramos que existe leadId
    const leadId = kommoEvent.leads.add?.[0]?.id;
    if (!leadId) {
      throw new Error("Lead ID missing in KommoLeadEventDTO");
    }

    // Limpiar undefined en path parameters para cumplir con el tipo estricto
    const cleanPathParams = Object.fromEntries(
      Object.entries(pathParams).filter(([, v]) => v !== undefined)
    ) as Record<string, string>;

    // Construcción del mensaje de cola
    const queueMessage: LeadQueueMessageDTO = {
      kommo: kommoEvent,
      pathParameters: cleanPathParams,
      enqueuedAt: new Date().toISOString(),
    };

    return queueMessage;
  }
}
