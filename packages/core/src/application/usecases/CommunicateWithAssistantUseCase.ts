// packages/core/src/application/usecases/CommunicateWithAssistantUseCase.ts

import { KommoService, OpenAIService } from '@clinickeys-agents/core/application/services';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import { localTime } from '@clinickeys-agents/core/utils';
import { z } from 'zod';
import {
  CheckReprogramAvailabilityUseCase,
  RescheduleAppointmentUseCase,
  RegularConversationUseCase,
  ScheduleAppointmentUseCase,
  RecognizeUserIntentUseCase,
  CheckAvailabilityUseCase,
  CancelAppointmentUseCase,
  ConfirmAppointmentUseCase,
  MarkPatientOnTheWayUseCase,
  HandleUrgencyUseCase,
} from '@clinickeys-agents/core/application/usecases';
import {
  PATIENT_MESSAGE_PROCESSED_CHUNK,
  PLEASE_WAIT_MESSAGE,
  REMINDER_MESSAGE,
  NOTIFICATION_ID,
  PATIENT_FIRST_NAME,
  PATIENT_LAST_NAME,
  PATIENT_PHONE,
  CLINIC_NAME,
  APPOINTMENT_DATE,
  APPOINTMENT_START_TIME,
  APPOINTMENT_END_TIME,
  APPOINTMENT_WEEKDAY_NAME,
  DOCTOR_FULL_NAME,
  TREATMENT_NAME,
  SPACE_NAME,
  BOT_MESSAGE,
  THREAD_ID,
} from '@clinickeys-agents/core/utils';

import type { BotConfigDTO } from '@clinickeys-agents/core/domain/botConfig';

const CitaSchema = z.object({
  id_cita: z.number(),
  id_medico: z.number().nullable().optional(),
  id_tratamiento: z.union([z.string(), z.number()]),
  fecha_cita: z.string(),
  hora_inicio: z.string(),
  hora_fin: z.string(),
  id_espacio: z.number().nullable().optional(),
  id_presupuesto: z.number().nullable().optional(),
  id_pack_bono: z.number().nullable().optional(),
  nombre_espacio: z.string().nullable().optional(),
  nombre_tratamiento: z.string().nullable().optional(),
  nombre_medico: z.string().nullable().optional()
});

const CheckAvailabilitySchema = z.object({
  tratamiento: z.string(),
  medico: z.string().nullable().optional(),
  espacio: z.string().nullable().optional(),
  fechas: z.string(),
  horas: z.string(),
  rango_dias_extra: z.number().optional(),
});

const ScheduleAppointmentSchema = CheckAvailabilitySchema.extend({
  nombre: z.string(),
  apellido: z.string(),
  telefono: z.string(),
  summary: z.string(),
});

const CheckReprogramAvailabilitySchema = z.object({
  id_cita: z.number(),
  id_tratamiento: z.number(),
  tratamiento: z.string(),
  medico: z.string().nullable().optional(),
  id_medico: z.number().nullable().optional(),
  espacio: z.string().nullable().optional(),
  id_espacio: z.number().nullable().optional(),
  fechas: z.string(),
  horas: z.string(),
  rango_dias_extra: z.number().optional(),
  citas_paciente: z.array(CitaSchema).optional(),
});

const RescheduleAppointmentSchema = CheckReprogramAvailabilitySchema.extend({
  nombre: z.string(),
  apellido: z.string(),
  telefono: z.string(),
  summary: z.string(),
});

const CancelAppointmentSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
  telefono: z.string(),
  id_cita: z.number(),
  summary: z.string(),
});

const ConfirmAppointmentSchema = z.object({
  id_cita: z.number(),
  summary: z.string(),
});

const MarkOnTheWaySchema = z.object({
  id_cita: z.number(),
  summary: z.string(),
});

const HandleUrgencySchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
  telefono: z.string(),
  motivo: z.string(),
  canal_preferido: z.string().nullable().optional(),
});

const RegularConversationSchema = z.object({
  assistantMessage: z.string(),
});

import { KommoCustomFieldValueBase } from '@clinickeys-agents/core/infrastructure/integrations/kommo';

export interface CommunicateInput {
  botConfig: BotConfigDTO;
  leadId: number;
  normalizedLeadCF: (KommoCustomFieldValueBase & { value: any })[];
  userMessage: string;
  reminderMessage: string;
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

export interface CommunicateWithAssistantUseCaseDeps {
  kommoService: KommoService;
  openAIService: OpenAIService;
  recognizeIntentUC: RecognizeUserIntentUseCase;
  scheduleAppointmentUC: ScheduleAppointmentUseCase;
  checkAvailabilityUC: CheckAvailabilityUseCase;
  checkReprogramAvailabilityUC: CheckReprogramAvailabilityUseCase;
  rescheduleAppointmentUC: RescheduleAppointmentUseCase;
  cancelAppointmentUC: CancelAppointmentUseCase;
  confirmAppointmentUC: ConfirmAppointmentUseCase;
  markPatientOnTheWayUC: MarkPatientOnTheWayUseCase;
  handleUrgencyUC: HandleUrgencyUseCase;
  regularConversationUC: RegularConversationUseCase;
}

export class CommunicateWithAssistantUseCase {
  constructor(private deps: CommunicateWithAssistantUseCaseDeps) { }

  public async execute(input: CommunicateInput): Promise<CommunicateOutput> {
    const { botConfig, leadId, normalizedLeadCF, userMessage, reminderMessage, threadId } = input;

    try {
      const intentResult = await this.deps.recognizeIntentUC.execute({
        botConfigType: botConfig.botConfigType,
        botConfigId: botConfig.botConfigId,
        clinicSource: botConfig.clinicSource,
        clinicId: botConfig.clinicId,
        leadId,
        tiempoActualDT: localTime(botConfig.timezone),
        reminderMessage,
        userMessage,
        openAIService: this.deps.openAIService,
        speakingBotId: botConfig.openai?.assistants?.speakingBot || '',
        threadId: threadId || undefined,
      } as any);

      const { intent: intentName, params, assistantResult, patientInfo } = intentResult;
      const { threadId: thId, runId, functionCalls, message: assistantPlainMessage } = assistantResult || {};
      Logger.info('[CommunicateWithAssistant] Intent detectada', { intentName, thId, runId });
      Logger.debug('[CommunicateWithAssistant] Parámetros de intent', { params });

      let ucResponse: UseCaseResponse;
      switch (intentName) {
        case 'consulta_agendar':
          Logger.debug('[CommunicateWithAssistant] Ejecutando consulta_agendar', { params });
          ucResponse = await this.deps.checkAvailabilityUC.execute({
            botConfig,
            leadId,
            normalizedLeadCF,
            params: CheckAvailabilitySchema.parse(params),
            tiempoActual: localTime(botConfig.timezone).toISO() as string,
            subdomain: botConfig.kommo.subdomain,
          });
          break;
        case 'agendar_cita':
          Logger.debug('[CommunicateWithAssistant] Ejecutando agendar_cita', { params });
          ucResponse = await this.deps.scheduleAppointmentUC.execute({
            botConfig,
            leadId,
            normalizedLeadCF,
            params: ScheduleAppointmentSchema.parse(params),
            tiempoActual: localTime(botConfig.timezone).toISO() as string,
            subdomain: botConfig.kommo.subdomain,
          });
          break;
        case 'consulta_reprogramar':
          Logger.debug('[CommunicateWithAssistant] Ejecutando consulta_reprogramar', { params });
          ucResponse = await this.deps.checkReprogramAvailabilityUC.execute({
            botConfig,
            leadId,
            normalizedLeadCF,
            patientInfo,
            params: CheckReprogramAvailabilitySchema.parse(params),
            tiempoActual: localTime(botConfig.timezone).toISO() as string,
            subdomain: botConfig.kommo.subdomain,
          });
          break;
        case 'reprogramar_cita':
          Logger.debug('[CommunicateWithAssistant] Ejecutando reprogramar_cita', { params });
          ucResponse = await this.deps.rescheduleAppointmentUC.execute({
            botConfig,
            leadId,
            normalizedLeadCF,
            patientInfo,
            params: RescheduleAppointmentSchema.parse(params),
            tiempoActual: localTime(botConfig.timezone).toISO() as string,
            subdomain: botConfig.kommo.subdomain,
          });
          break;
        case 'cancelar_cita':
          Logger.debug('[CommunicateWithAssistant] Ejecutando cancelar_cita', { params });
          ucResponse = await this.deps.cancelAppointmentUC.execute({
            botConfig,
            leadId,
            normalizedLeadCF,
            params: CancelAppointmentSchema.parse(params),
          });
          break;
        case 'tarea':
          Logger.debug('[CommunicateWithAssistant] Ejecutando caso de tarea/urgencia/escalamiento', { params });
          ucResponse = await this.deps.handleUrgencyUC.execute({
            botConfig,
            leadId,
            normalizedLeadCF,
            params: HandleUrgencySchema.parse(params),
          });
          break;
        case 'confirmar_cita':
          Logger.debug('[CommunicateWithAssistant] Ejecutando confirmar_cita', { params });
          ucResponse = await this.deps.confirmAppointmentUC.execute({
            botConfig,
            leadId,
            normalizedLeadCF,
            params: ConfirmAppointmentSchema.parse(params),
          });
          break;
        case 'paciente_en_camino':
          Logger.debug('[CommunicateWithAssistant] Ejecutando paciente_en_camino', { params });
          ucResponse = await this.deps.markPatientOnTheWayUC.execute({
            botConfig,
            leadId,
            normalizedLeadCF,
            params: MarkOnTheWaySchema.parse(params),
          });
          break;
        default:
          Logger.debug('[CommunicateWithAssistant] Ejecutando conversación regular', { assistantPlainMessage });
          ucResponse = await this.deps.regularConversationUC.execute({
            params: RegularConversationSchema.parse({ assistantMessage: assistantPlainMessage || '' }),
          });
      }

      if (!ucResponse.success) {
        Logger.error('[CommunicateWithAssistant] UC devolvió error', { intentName, ucResponse });
        throw new Error('El caso de uso devolvió error.');
      }

      let finalMsg: string = assistantPlainMessage || '';

      if (runId && Array.isArray(functionCalls) && functionCalls.length > 0) {
        Logger.info('[CommunicateWithAssistant] Resolviendo functionCalls', { count: functionCalls.length });
        const resolved = await this.deps.openAIService.getResponseFromWaitingAssistant({
          threadId: thId!,
          runId: runId!,
          functionCalls,
          rawOutput: ucResponse.toolOutput,
        });
        Logger.debug('[CommunicateWithAssistant] Respuesta tras functionCalls', { resolvedMessage: resolved.message });
        finalMsg = resolved.message || '';
      }

      const baseFields: Record<string, string> = {
        // custom fields for reminder
        [APPOINTMENT_WEEKDAY_NAME]: '',
        [APPOINTMENT_START_TIME]: '',
        [APPOINTMENT_END_TIME]: '',
        [PATIENT_FIRST_NAME]: '',
        [PATIENT_LAST_NAME]: '',
        [APPOINTMENT_DATE]: '',
        [REMINDER_MESSAGE]: '',
        [DOCTOR_FULL_NAME]: '',
        [NOTIFICATION_ID]: '',
        [TREATMENT_NAME]: '',
        [PATIENT_PHONE]: '',
        [CLINIC_NAME]: '',
        [SPACE_NAME]: '',

        // chat custom fields
        [THREAD_ID]: thId ?? '',
        [BOT_MESSAGE]: finalMsg || '',
        [PLEASE_WAIT_MESSAGE]: 'false',
        [PATIENT_MESSAGE_PROCESSED_CHUNK]: userMessage,
      };

      const customFields = { ...baseFields, ...(ucResponse.customFields ?? {}) };
      Logger.info('[CommunicateWithAssistant] Campos a enviar a Kommo', {
        baseFields,
        ucCustomFields: ucResponse.customFields,
        mergedCustomFieldsCount: normalizedLeadCF.length,
        mergedCustomFieldsSample: normalizedLeadCF.slice(0, 5).map(cf => ({ name: cf.field_name, id: cf.field_id })),
      });

      Logger.debug('[CommunicateWithAssistant] Llamando a replyToLead', { customFields });
      console.log("[CommunicateWithAssistantUseCase.execute] UC customFields", ucResponse.customFields);
      const replyResult = await this.deps.kommoService.replyToLead({
        salesbotId: botConfig.kommo.salesbotId,
        leadId,
        customFields,
        normalizedLeadCF,
      });
      Logger.debug('[CommunicateWithAssistant] Resultado de replyToLead', { replyResult });

      Logger.info('[CommunicateWithAssistant] Ejecución completada con éxito', { leadId });
      return { success: true, message: finalMsg || '' };
    } catch (error) {
      Logger.error('[CommunicateWithAssistant] Error general', { error });
      return {
        success: false,
        message: 'No fue posible procesar el mensaje en este momento.',
      };
    }
  }
}