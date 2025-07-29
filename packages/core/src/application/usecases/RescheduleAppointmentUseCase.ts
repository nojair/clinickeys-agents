import path from 'path';
import { readFile } from 'fs/promises';
import type { DateTime } from 'luxon';
import type { BotConfigDTO } from '@clinickeys-agents/core/domain/botConfig';
import { KommoService } from '@clinickeys-agents/core/application/services/KommoService';
import { AppointmentService } from '@clinickeys-agents/core/application/services/AppointmentService';
import { AvailabilityService } from '@clinickeys-agents/core/application/services/AvailabilityService';
import { PatientService } from '@clinickeys-agents/core/application/services/PatientService';
import { OpenAIService } from '@clinickeys-agents/core/application/services/OpenAIService';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import {
  PATIENT_MESSAGE,
  REMINDER_MESSAGE,
  PLEASE_WAIT_MESSAGE,
  BOT_MESSAGE,
  THREAD_ID,
  PATIENT_FIRST_NAME,
  PATIENT_LAST_NAME,
  PATIENT_PHONE,
} from '@clinickeys-agents/core/utils/constants';
import { ConsultaCitaSchema } from '@clinickeys-agents/core/utils/schemas';

interface RescheduleAppointmentInput {
  botConfig: BotConfigDTO;
  leadId: number;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  salesbotId: number;
  threadId: string;
  params: {
    id_cita: number;
    tratamiento: string;
    medico?: string | null;
    id_medico?: number | null;
    fechas: Array<{ fecha: string }>;
    horas: Array<{ hora_inicio: string; hora_fin: string }>;
    rango_dias_extra?: number;
    citas_paciente?: Array<{ id_cita: number; [key: string]: any }>;
  };
  tiempoActual: DateTime;
  subdomain: string;
}

interface RescheduleAppointmentOutput {
  success: boolean;
  message: string;
  appointmentId?: number;
}

export class RescheduleAppointmentUseCase {
  constructor(
    private readonly kommoService: KommoService,
    private readonly appointmentService: AppointmentService,
    private readonly availabilityService: AvailabilityService,
    private readonly patientService: PatientService,
    private readonly openAIService: OpenAIService,
  ) {}

  public async execute(input: RescheduleAppointmentInput): Promise<RescheduleAppointmentOutput> {
    const { botConfig, leadId, mergedCustomFields, salesbotId, threadId, params, tiempoActual, subdomain } = input;
    const { id_cita, tratamiento, medico, id_medico, fechas, horas, citas_paciente } = params;

    try {
      await this.kommoService.sendBotInitialMessage({
        botConfig,
        leadId,
        mergedCustomFields,
        salesbotId,
        message: 'Muy bien, voy a reagendar tu cita. Un momento por favor.'
      });

      const patientInfo = await this.patientService.getPatientInfo(
        tiempoActual,
        botConfig.clinicId,
        { in_conversation: '', in_field: '', in_contact: '' }
      );
      const citasPaciente = params.citas_paciente?.length
        ? params.citas_paciente
        : patientInfo.citas || [];

      const STEPS = [
        { tipo_busqueda: 'original', filtros_aplicados: { con_medico: true, rango_dias_extra: 0 }, params: { ...params } },
        { tipo_busqueda: 'ampliada_mismo_medico', filtros_aplicados: { con_medico: true, rango_dias_extra: 45 }, params: { ...params, rango_dias_extra: 45 } },
        { tipo_busqueda: 'ampliada_sin_medico_rango_dias_original', filtros_aplicados: { con_medico: false, rango_dias_extra: 0 }, params: { ...params, medico: null, id_medico: null } },
        { tipo_busqueda: 'ampliada_sin_medico_rango_dias_extendido', filtros_aplicados: { con_medico: false, rango_dias_extra: 45 }, params: { ...params, medico: null, id_medico: null, rango_dias_extra: 45 } }
      ];

      let finalPayload: any = null;
      let extractorData: any = null;
      let appointmentReprogrammed: any = null;
      let finalMessage: string = "";

      for (const step of STEPS) {
        const availabilityResponse = await this.availabilityService.getAvailabilityInfo({
          id_clinica: botConfig.clinicId,
          id_super_clinica: botConfig.superClinicId,
          tiempo_actual: tiempoActual,
          mensajeBotParlante: JSON.stringify({
            tratamiento: step.params.tratamiento,
            fechas,
            horas,
            medico: step.params.medico,
            id_medico: step.params.id_medico,
          }),
          subdomain,
          kommoToken: botConfig.crmApiKey,
          leadId
        });
        Logger.info(
          `[RescheduleAppointmentUseCase] Paso '${step.tipo_busqueda}' respuesta:`,
          availabilityResponse
        );

        if (
          availabilityResponse.success &&
          Array.isArray(availabilityResponse.analisis_agenda) &&
          availabilityResponse.analisis_agenda.length > 0
        ) {
          finalPayload = {
            tipo_busqueda: step.tipo_busqueda,
            filtros_aplicados: step.filtros_aplicados,
            tratamiento: { id: id_medico || null, nombre: step.params.tratamiento },
            horarios: availabilityResponse.analisis_agenda
          };

          const citaParaReprogramar = citasPaciente.find((c: any) => c.id_cita === id_cita);
          const extractorPrompt = `#reprogramarCita\nLa CITA_PACIENTE a reprogramar es: ${JSON.stringify(
            citaParaReprogramar
          )}\nLos HORARIOS_DISPONIBLES: ${JSON.stringify(finalPayload)}\nMENSAJE_USUARIO: ${JSON.stringify(
            params
          )}`;
          const promptPath = path.resolve(
            __dirname,
            '../../.ia/instructions/prompts/bot_extractor_de_datos.md'
          );
          const systemPrompt = await readFile(promptPath, 'utf8');
          extractorData = await this.openAIService.getSchemaStructuredResponse(
            systemPrompt,
            extractorPrompt,
            ConsultaCitaSchema,
            'consultaCitaSchema'
          );

          if (extractorData.errorMessage) {
            finalMessage = `#reprogramarCita\n\n${extractorData.errorMessage}`;
            break;
          }
          if (extractorData.id_cita) {
            await this.appointmentService.updateAppointment({
              id_cita: extractorData.id_cita,
              id_medico: extractorData.id_medico,
              fecha_cita: extractorData.fecha_cita,
              hora_inicio: extractorData.hora_inicio,
              hora_fin: extractorData.hora_fin,
              id_espacio: extractorData.id_espacio
            });
            appointmentReprogrammed = extractorData;
          }
          break;
        }
      }

      if (!finalPayload) {
        finalPayload = {
          tipo_busqueda: 'sin_disponibilidad',
          filtros_aplicados: { con_medico: !!medico, rango_dias_extra: 0 },
          tratamiento: { id: id_medico || null, nombre: tratamiento },
          horarios: []
        };
      }

      if (!finalMessage) {
        if (appointmentReprogrammed?.id_cita) {
          finalMessage = `#reprogramarCita\nTu cita ha sido reprogramada para ${appointmentReprogrammed.fecha_cita} a las ${
            appointmentReprogrammed.hora_inicio
          }.`;
        } else if (finalPayload.horarios.length === 0) {
          finalMessage = `#reprogramarCita\nLo siento, no hay horarios disponibles. ¿Quieres otro rango?`;
        } else {
          finalMessage = `#reprogramarCita\nHORARIOS_DISPONIBLES: ${JSON.stringify(
            finalPayload
          )}\nMENSAJE_USUARIO: ${JSON.stringify(params)}`;
        }
      }

      const customFields: Record<string, string> = {
        [PATIENT_MESSAGE]: '',
        [REMINDER_MESSAGE]: '',
        [PLEASE_WAIT_MESSAGE]: 'false',
        [BOT_MESSAGE]: finalMessage,
        [THREAD_ID]: threadId,
        [PATIENT_FIRST_NAME]: '',
        [PATIENT_LAST_NAME]: '',
        [PATIENT_PHONE]: ''
      };
      await this.kommoService.replyToLead({
        botConfig,
        leadId,
        customFields,
        mergedCustomFields,
        salesbotId
      });

      return { success: true, message: finalMessage, appointmentId: appointmentReprogrammed?.id_cita };
    } catch (error) {
      Logger.error('[RescheduleAppointmentUseCase] Error reprogramando cita:', error);
      return { success: false, message: 'No fue posible reprogramar la cita en este momento.' };
    }
  }
}
