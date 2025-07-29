import type { BotConfigDTO } from '@clinickeys-agents/core/domain/botConfig';
import { KommoService } from '@clinickeys-agents/core/application/services/KommoService';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import {
  PATIENT_MESSAGE,
  REMINDER_MESSAGE,
  THREAD_ID,
  BOT_MESSAGE
} from '@clinickeys-agents/core/utils/constants';

interface HandleUrgencyInput {
  botConfig: BotConfigDTO;
  leadId: number;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  salesbotId: number;
  threadId: string;
  params: {
    nombre: string;
    apellido: string;
    telefono: string;
    motivo: string;
    canal_preferido: string;
  };
  delayMs?: number;
}

interface HandleUrgencyOutput {
  success: boolean;
  aborted?: boolean;
  message?: string;
}

export class HandleUrgencyUseCase {
  constructor(
    private readonly kommoService: KommoService,
  ) {}

  public async execute(input: HandleUrgencyInput): Promise<HandleUrgencyOutput> {
    const {
      botConfig,
      leadId,
      mergedCustomFields,
      salesbotId,
      threadId,
      params,
      delayMs = 10000,
    } = input;
    const { nombre, apellido, telefono, motivo, canal_preferido } = params;

    try {
      // 1. Crear tarea en Kommo (48 horas)
      await this.kommoService.createTask({
        leadId,
        message: `nombre: ${nombre}\napellido: ${apellido}\ntelefono: ${telefono}\nmotivo: ${motivo}\ncanal preferido: ${canal_preferido}`,
        minutesSinceNow: 48 * 60,
        responsibleUserId: salesbotId
      });

      // 2. Confirmar al paciente
      const finalMessage = '#urgencia\n\nTarea creada con éxito';
      const customFields: Record<string, string> = {
        [PATIENT_MESSAGE]: '',
        [REMINDER_MESSAGE]: '',
        [THREAD_ID]: threadId,
        [BOT_MESSAGE]: finalMessage,
      };
      const result = await this.kommoService.replyToLead({
        botConfig,
        leadId,
        customFields,
        mergedCustomFields,
        salesbotId,
        delayMs
      });

      if (result.aborted) {
        Logger.info(`[HandleUrgencyUseCase] Tarea abortada para lead ${leadId}`);
        return { success: false, aborted: true, message: 'La tarea fue abortada.' };
      }

      Logger.info(`[HandleUrgencyUseCase] Tarea creada y mensaje enviado para lead ${leadId}`);
      return { success: true, message: finalMessage };
    } catch (error) {
      Logger.error(`[HandleUrgencyUseCase] Error manejando urgencia para lead ${leadId}:`, error);
      return { success: false, message: 'Error creando la tarea de urgencia.' };
    }
  }
}
