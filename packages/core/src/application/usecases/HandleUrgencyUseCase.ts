import { KommoService } from '@clinickeys-agents/core/application/services';

interface HandleUrgencyInput {
  botConfig: any;
  leadId: number;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  salesbotId: number;
  params: {
    tipo: 'urgencia' | 'escalamiento' | 'tarea';
    mensaje_usuario: string;
  };
}

interface HandleUrgencyOutput {
  success: boolean;
  toolOutput: string;
}

/**
 * Gestiona intents de urgencia / escalamiento / creación de tarea.
 * No ejecuta acciones de BD; sólo construye el mensaje para que
 * el Bot Parlante genere la respuesta final y marque el run como completed.
 */
export class HandleUrgencyUseCase {
  constructor(private readonly kommoService: KommoService) {}

  public async execute(input: HandleUrgencyInput): Promise<HandleUrgencyOutput> {
    const { botConfig, leadId, mergedCustomFields, salesbotId, params } = input;
    const { tipo, mensaje_usuario } = params;

    // 1) "please‑wait" inicial
    await this.kommoService.sendBotInitialMessage({
      botConfig,
      leadId,
      mergedCustomFields,
      salesbotId,
      message: 'Entendido, derivando tu caso al equipo correspondiente. Un momento…',
    });

    // 2) toolOutput directo
    const toolOutput = `#${tipo}\nMENSAJE_USUARIO: ${mensaje_usuario}`;

    return { success: true, toolOutput };
  }
}
