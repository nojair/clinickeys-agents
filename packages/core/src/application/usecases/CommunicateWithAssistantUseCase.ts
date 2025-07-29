import {
  KommoService,
  OpenAIService,
} from '@clinickeys-agents/core/application/services';

import {
  RecognizeUserIntentUseCase,
  ScheduleAppointmentUseCase,
  CheckAvailabilityUseCase,
  CheckReprogramAvailabilityUseCase,
  RescheduleAppointmentUseCase,
  CancelAppointmentUseCase,
  HandleUrgencyUseCase,
  RegularConversationUseCase,
} from '@clinickeys-agents/core/application/usecases';

import {
  PATIENT_MESSAGE,
  REMINDER_MESSAGE,
  PLEASE_WAIT_MESSAGE,
  BOT_MESSAGE,
  THREAD_ID,
} from '@clinickeys-agents/core/utils/constants';

import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import type { BotConfigDTO } from '@clinickeys-agents/core/domain/botConfig';
import { DateTime } from 'luxon';

interface CommunicateInput {
  botConfig: BotConfigDTO;
  leadId: number;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  salesbotId: number;
  userMessage: string;
  threadId?: string | null;
}

interface UseCaseResponse {
  success: boolean;
  toolOutput: string;
  customFields?: Record<string, string>;
}

interface CommunicateOutput {
  success: boolean;
  message: string;
}

export class CommunicateWithAssistantUseCase {
  constructor(
    private readonly kommoService: KommoService,
    private readonly openAIService: OpenAIService,
    private readonly recognizeIntentUC: RecognizeUserIntentUseCase,
    private readonly scheduleAppointmentUC: ScheduleAppointmentUseCase,
    private readonly checkAvailabilityUC: CheckAvailabilityUseCase,
    private readonly checkReprogramAvailabilityUC: CheckReprogramAvailabilityUseCase,
    private readonly rescheduleAppointmentUC: RescheduleAppointmentUseCase,
    private readonly cancelAppointmentUC: CancelAppointmentUseCase,
    private readonly handleUrgencyUC: HandleUrgencyUseCase,
    private readonly regularConversationUC: RegularConversationUseCase,
  ) { }

  public async execute(input: CommunicateInput): Promise<CommunicateOutput> {
    const { botConfig, leadId, mergedCustomFields, salesbotId, userMessage, threadId } = input;

    try {
      /** 1) Detectar intención usando nueva firma */
      const intentResult = await this.recognizeIntentUC.execute({
        botConfigId: botConfig.botConfigId,
        clinicSource: botConfig.clinicSource,
        clinicId: botConfig.clinicId,
        leadId,
        tiempoActualDT: DateTime.utc().setZone(botConfig.timezone),
        userMessage,
        assistantService: this.openAIService,
      });

      const { intent: intentName, params, assistantResult } = intentResult;
      const { threadId: thId, runId, functionCalls } = assistantResult || {};
      Logger.info('[Communicate] Intento detectado:', intentName);

      /** 2) Ejecutar UC específico */
      let ucResponse: UseCaseResponse;

      switch (intentName) {
        case 'consulta_agendar':
          interface CheckAvailabilityInput {
            botConfig: any;
            leadId: number;
            mergedCustomFields: { id: string | number; name: string; value?: string }[];
            salesbotId: number;
            params: {
              tratamiento: string;
              medico?: string | null;
              fechas: Array<{ fecha: string }> | string;
              horas: Array<{ hora_inicio: string; hora_fin: string }>;
              rango_dias_extra?: number;
            };
            tiempoActual: any;
            subdomain: string;
          }
          ucResponse = await this.checkAvailabilityUC.execute(params as CheckAvailabilityInput);
          break;
        case 'agendar_cita':
          interface ScheduleAppointmentInput {
            botConfig: any;
            leadId: number;
            mergedCustomFields: { id: string | number; name: string; value?: string }[];
            salesbotId: number;
            params: {
              nombre: string;
              apellido: string;
              telefono: string;
              tratamiento: string;
              medico?: string | null;
              fechas: Array<{ fecha: string }> | string;
              horas: Array<{ hora_inicio: string; hora_fin: string }>;
              rango_dias_extra?: number;
            };
            tiempoActual: any;
            subdomain: string;
          }
          ucResponse = await this.scheduleAppointmentUC.execute(params as ScheduleAppointmentInput);
          break;
        case 'consulta_reprogramar':
          interface CheckReprogramAvailabilityInput {
            botConfig: any;
            leadId: number;
            mergedCustomFields: { id: string | number; name: string; value?: string }[];
            salesbotId: number;
            params: {
              id_cita: number;
              id_tratamiento: string;
              tratamiento: string;
              medico?: string | null;
              id_medico?: number | null;
              fechas: Array<{ fecha: string }> | string;
              horas: Array<{ hora_inicio: string; hora_fin: string }>;
              rango_dias_extra?: number;
              citas_paciente?: Array<{ id_cita: number;[key: string]: any }>;
            };
            tiempoActual: any;
            subdomain: string;
          }
          ucResponse = await this.checkReprogramAvailabilityUC.execute(params as CheckReprogramAvailabilityInput);
          break;
        case 'reprogramar_cita':
          interface RescheduleAppointmentInput {
            botConfig: any;
            leadId: number;
            mergedCustomFields: { id: string | number; name: string; value?: string }[];
            salesbotId: number;
            params: {
              id_cita: number;
              id_tratamiento: string;
              tratamiento: string;
              medico?: string | null;
              id_medico?: number | null;
              fechas: Array<{ fecha: string }> | string;
              horas: Array<{ hora_inicio: string; hora_fin: string }>;
              rango_dias_extra?: number;
              citas_paciente?: Array<{ id_cita: number;[k: string]: any }>;
            };
            tiempoActual: any;
            subdomain: string;
          }
          ucResponse = await this.rescheduleAppointmentUC.execute(params as RescheduleAppointmentInput);
          break;
        case 'cancelar_cita':
          interface CancelAppointmentInput {
            botConfig: any;
            leadId: number;
            mergedCustomFields: { id: string | number; name: string; value?: string }[];
            salesbotId: number;
            params: {
              id_cita: number;
              id_medico?: number | null;
              id_espacio?: number | null;
              fecha_cita?: string;
              hora_inicio?: string;
              hora_fin?: string;
            };
          }
          ucResponse = await this.cancelAppointmentUC.execute(params as CancelAppointmentInput);
          break;
        case 'urgencia':
        case 'escalamiento':
        case 'tarea':
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
          ucResponse = await this.handleUrgencyUC.execute(params as HandleUrgencyInput);
          break;
        default:
          interface RegularConversationInput {
            botConfig: any;
            leadId: number;
            mergedCustomFields: { id: string | number; name: string; value?: string }[];
            salesbotId: number;
            params: {
              assistantMessage: string; // texto del assistant ya listo
            };
          }
          ucResponse = await this.regularConversationUC.execute(params as RegularConversationInput);
      }

      if (!ucResponse.success) throw new Error('El caso de uso devolvió error.');

      /** 3) Resolver Run pendiente */
      const { message: finalMsg } = await this.openAIService.getResponseFromWaitingAssistant({
        threadId: thId,
        runId,
        functionCalls,
        rawOutput: ucResponse.toolOutput,
      });

      /** 4) Construir customFields y responder */
      const baseFields: Record<string, string> = {
        [PATIENT_MESSAGE]: '',
        [REMINDER_MESSAGE]: '',
        [PLEASE_WAIT_MESSAGE]: 'false',
        [BOT_MESSAGE]: finalMsg as string,
        [THREAD_ID]: thId ?? '',
      };

      const customFields = { ...baseFields, ...(ucResponse.customFields ?? {}) };

      await this.kommoService.replyToLead({
        botConfig,
        leadId,
        customFields,
        mergedCustomFields,
        salesbotId,
      });

      return { success: true, message: finalMsg as string };
    } catch (error) {
      Logger.error('[CommunicateWithAssistantUseCase] Error:', error);
      return { success: false, message: 'No fue posible procesar el mensaje en este momento.' };
    }
  }
}
