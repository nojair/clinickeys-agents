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
   * @param pathParams   parámetros de la ruta capturados por API Gateway
   *                      (en este caso, debe ser un array, o el objeto con índices 0...4)
   *                      Ej: { "0": "chatBot", "1": "abc123", "2": "kommo", "3": "321", "4": "654" }
   */
  async execute(
    kommoEvent: KommoLeadEventDTO,
    queryStringParameters: Record<string, string | undefined>
  ): Promise<LeadQueueMessageDTO> {
    this.logger.info("Building LeadQueueMessageDTO", { kommoEvent, queryStringParameters });

    // Validación mínima: aseguramos que existe leadId
    const leadId = kommoEvent.leads.add?.[0]?.id;
    if (!leadId) {
      throw new Error("Lead ID missing in KommoLeadEventDTO");
    }

    // Extraer por orden exacto los valores de pathParams
    // (esperando que vengan en pathParams["0"], pathParams["1"], etc)
    const botConfigType = queryStringParameters.a;
    const botConfigId = queryStringParameters.b;
    const clinicSource = queryStringParameters.c;
    const clinicId = queryStringParameters.d;
    const salesbotId = queryStringParameters.e;

    // Validar todos los requeridos (los primeros 4)
    if (!botConfigType || !botConfigId || !clinicSource || !clinicId) {
      throw new Error(
        "Missing required path parameters: botConfigType, botConfigId, clinicSource, clinicId"
      );
    }

    // Armar el objeto pathParameters
    const orderedPathParameters: Record<string, string> = {
      botConfigType,
      botConfigId,
      clinicSource,
      clinicId,
    };
    if (salesbotId) {
      orderedPathParameters.salesbotId = salesbotId;
    }

    // Construcción del mensaje de cola
    const queueMessage: LeadQueueMessageDTO = {
      kommo: kommoEvent,
      pathParameters: orderedPathParameters,
      enqueuedAt: new Date().toISOString(),
    };

    return queueMessage;
  }
}
