import { KommoService } from '@clinickeys-agents/core/application/services/KommoService';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import {
  PATIENT_MESSAGE,
  REMINDER_MESSAGE,
  THREAD_ID,
  BOT_MESSAGE,
  PATIENT_FIRST_NAME,
  PATIENT_LAST_NAME,
  PATIENT_PHONE,
} from '@clinickeys-agents/core/utils/constants';
import type { BotConfigDTO } from '@clinickeys-agents/core/domain/botConfig';

interface RegularConversationInput {
  botConfig: BotConfigDTO;
  leadId: number;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  threadId: string;
  botMessage: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientPhone?: string;
  delayMs?: number;
  salesbotId: number;
}

interface RegularConversationOutput {
  success: boolean;
  message?: string;
  aborted?: boolean;
}

export class RegularConversationUseCase {
  constructor(
    private readonly kommoService: KommoService,
  ) {}

  public async execute(input: RegularConversationInput): Promise<RegularConversationOutput> {
    const {
      botConfig,
      leadId,
      mergedCustomFields,
      threadId,
      botMessage,
      patientFirstName,
      patientLastName,
      patientPhone,
      delayMs = 10000,
      salesbotId,
    } = input;

    const customFields: Record<string, string> = {
      [PATIENT_MESSAGE]: '',
      [REMINDER_MESSAGE]: '',
      [THREAD_ID]: threadId,
      [BOT_MESSAGE]: botMessage,
      [PATIENT_FIRST_NAME]: patientFirstName ?? '',
      [PATIENT_LAST_NAME]: patientLastName ?? '',
      [PATIENT_PHONE]: patientPhone ?? '',
    };

    try {
      const result = await this.kommoService.replyToLead({
        botConfig,
        leadId: Number(leadId),
        customFields,
        mergedCustomFields,
        delayMs,
        salesbotId
      });

      if (result.aborted) {
        Logger.info(
          `[RegularConversationUseCase] Respuesta abortada para leadId ${leadId}`
        );
        return {
          success: false,
          aborted: true,
          message: 'La respuesta fue abortada porque patientMessage cambió en Kommo.'
        };
      }

      Logger.info(
        `[RegularConversationUseCase] Mensaje de conversación regular enviado a leadId ${leadId}`
      );
      return {
        success: true,
        message: 'Mensaje de conversación regular enviado con éxito.'
      };
    } catch (error) {
      Logger.error(
        `[RegularConversationUseCase] Error al enviar conversación regular a leadId ${leadId}:`,
        error
      );
      return {
        success: false,
        message: 'Falló al enviar la respuesta de conversación regular.'
      };
    }
  }
}
