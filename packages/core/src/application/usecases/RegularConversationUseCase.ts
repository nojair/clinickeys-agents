import { KommoService } from '@clinickeys-agents/core/application/services';

interface RegularConversationInput {
  botConfig: any;
  leadId: number;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  salesbotId: number;
  params: {
    assistantMessage: string; // texto del assistant ya listo
  };
}

interface RegularConversationOutput {
  success: boolean;
  toolOutput: string;
}

/**
 * Use Case para mensajes de conversación normal donde
 * no se invoca ninguna tool‑call adicional.
 * Solo devuelve el mensaje del assistant como `toolOutput`
 * para que el orquestador lo envíe a `resolveRun` y luego a Kommo.
 */
export class RegularConversationUseCase {
  constructor(private readonly kommoService: KommoService) {}

  public async execute(input: RegularConversationInput): Promise<RegularConversationOutput> {
    const { botConfig, leadId, mergedCustomFields, salesbotId, params } = input;

    // Mensaje "escribiendo…" opcional
    await this.kommoService.sendBotInitialMessage({
      botConfig,
      leadId,
      mergedCustomFields,
      salesbotId,
      message: 'Un momento…',
    });

    return { success: true, toolOutput: params.assistantMessage };
  }
}
