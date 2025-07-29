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

interface ScheduleAppointmentInput {
  botConfig: BotConfigDTO;
  leadId: number;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  salesbotId: number;
  threadId: string;
  params: {
    nombre: string;
    apellido: string;
    telefono: string;
    tratamiento: string;
    medico?: string | null;
    fechas: Array<{ fecha: string }>;
    horas: Array<{ hora_inicio: string; hora_fin: string }>;
    rango_dias_extra?: number;
  };
  tiempoActual: DateTime;
  subdomain: string;
}

interface ScheduleAppointmentOutput {
  success: boolean;
  message: string;
  appointmentId?: number;
  aborted?: boolean;
}

export class ScheduleAppointmentUseCase {
  constructor(
    private readonly kommoService: KommoService,
    private readonly appointmentService: AppointmentService,
    private readonly availabilityService: AvailabilityService,
    private readonly patientService: PatientService,
    private readonly openAIService: OpenAIService,
  ) {}

  public async execute(input: ScheduleAppointmentInput): Promise<ScheduleAppointmentOutput> {
    const { botConfig, leadId, mergedCustomFields, salesbotId, threadId, params, tiempoActual, subdomain } = input;
    const { nombre, apellido, telefono, tratamiento, medico, fechas, horas } = params;

    try {
      await this.kommoService.sendBotInitialMessage({
        botConfig,
        leadId: Number(leadId),
        mergedCustomFields,
        salesbotId,
        message: 'Muy bien, voy a agendar tu cita. Un momento por favor.'
      });

      let patientInfo = await this.patientService.getPatientInfo(
        tiempoActual,
        botConfig.clinicId,
        { in_conversation: telefono, in_field: '', in_contact: '' }
      );
      if (patientInfo.message?.includes('[ERROR_NO_PATIENT_FOUND]')) {
        const createdId = await this.patientService.createPatient({
          nombre,
          apellido,
          telefono,
          id_clinica: botConfig.clinicId,
          id_super_clinica: botConfig.superClinicId,
          kommo_lead_id: Number(leadId),
        });
        patientInfo.paciente = { id_paciente: createdId };
        Logger.info(`[ScheduleAppointmentUseCase] Paciente creado: ${createdId}`);
      }

      const STEPS = [
        { tipo_busqueda: 'original', filtros_aplicados: { con_medico: !!medico, rango_dias_extra: 0 }, params: { ...params } },
        { tipo_busqueda: 'ampliada_mismo_medico', filtros_aplicados: { con_medico: !!medico, rango_dias_extra: 45 }, params: { ...params, rango_dias_extra: 45 } },
        { tipo_busqueda: 'ampliada_sin_medico_rango_dias_original', filtros_aplicados: { con_medico: false, rango_dias_extra: 0 }, params: { ...params, medico: null } },
        { tipo_busqueda: 'ampliada_sin_medico_rango_dias_extendido', filtros_aplicados: { con_medico: false, rango_dias_extra: 45 }, params: { ...params, medico: null, rango_dias_extra: 45 } }
      ];

      let finalPayload: any = null;
      let extractorData: any = null;
      let appointmentCreated: any = null;
      let finalMessage: string = "";

      for (const step of STEPS) {
        const availabilityResponse = await this.availabilityService.getAvailabilityInfo({
          id_clinica: botConfig.clinicId,
          id_super_clinica: botConfig.superClinicId,
          tiempo_actual: tiempoActual,
          mensajeBotParlante: JSON.stringify({ tratamiento: step.params.tratamiento, fechas, horas, medico: step.params.medico }),
          subdomain,
          kommoToken: botConfig.crmApiKey,
          leadId: Number(leadId),
        });
        Logger.info(`[ScheduleAppointmentUseCase] Paso '${step.tipo_busqueda}' respuesta:`, availabilityResponse);

        if (availabilityResponse.success && Array.isArray(availabilityResponse.analisis_agenda) && availabilityResponse.analisis_agenda.length) {
          finalPayload = { tipo_busqueda: step.tipo_busqueda, filtros_aplicados: step.filtros_aplicados, tratamiento: { id: null, nombre: step.params.tratamiento }, horarios: availabilityResponse.analisis_agenda };

          const extractorPrompt = `#agendarCita\n\nLos HORARIOS_DISPONIBLES son: ${JSON.stringify(finalPayload)}\n\nMENSAJE_USUARIO: ${JSON.stringify(params)}`;
          const promptPath = path.resolve(__dirname, '../../.ia/instructions/prompts/bot_extractor_de_datos.md');
          const systemPrompt = await readFile(promptPath, 'utf8');
          extractorData = await this.openAIService.getSchemaStructuredResponse(systemPrompt, extractorPrompt, ConsultaCitaSchema, 'consultaCitaSchema');

          if (extractorData.success) {
            const spResponse = await this.appointmentService.insertarCitaPackBonos({
              p_id_clinica: botConfig.clinicId,
              p_id_super_clinica: botConfig.superClinicId,
              p_id_paciente: patientInfo.paciente?.id_paciente,
              p_id_medico: extractorData.id_medico,
              p_id_espacio: extractorData.id_espacio,
              p_id_tratamiento: extractorData.id_tratamiento,
              p_id_pack_bono: extractorData.id_pack_bono || 0,
              p_id_presupuesto: extractorData.id_presupuesto || 0,
              p_fecha_cita: extractorData.fecha_cita,
              p_hora_inicio: extractorData.hora_inicio,
              p_hora_fin: extractorData.hora_fin
            });
            const id_cita = spResponse?.[0]?.[0]?.id_cita;
            appointmentCreated = id_cita ? { ...extractorData, id_cita } : null;
          }
          break;
        }
      }

      if (!finalPayload) {
        finalPayload = { tipo_busqueda: 'sin_disponibilidad', filtros_aplicados: { con_medico: !!medico, rango_dias_extra: 0 }, tratamiento: { id: null, nombre: tratamiento }, horarios: [] };
      }

      if (!finalMessage) {
        if (appointmentCreated?.id_cita) {
          finalMessage = `#agendarCita\nTu cita de ${appointmentCreated.nombre_tratamiento} fue agendada para ${appointmentCreated.fecha_cita} a las ${appointmentCreated.hora_inicio}.`;
        } else if (finalPayload.horarios.length === 0) {
          finalMessage = `#agendarCita\nLo siento, no hay horarios disponibles. ¿Quieres otro rango?`;
        } else {
          finalMessage = `#agendarCita\nHORARIOS_DISPONIBLES: ${JSON.stringify(finalPayload)}\nMENSAJE_USUARIO: ${JSON.stringify(params)}`;
        }
      }

      const customFields: Record<string,string> = {
        [PATIENT_MESSAGE]: '',
        [REMINDER_MESSAGE]: '',
        [PLEASE_WAIT_MESSAGE]: 'false',
        [BOT_MESSAGE]: finalMessage,
        [THREAD_ID]: threadId,
        [PATIENT_FIRST_NAME]: nombre,
        [PATIENT_LAST_NAME]: apellido,
        [PATIENT_PHONE]: telefono
      };
      await this.kommoService.replyToLead({ botConfig, leadId: Number(leadId), customFields, mergedCustomFields, salesbotId });

      return { success: true, message: finalMessage, appointmentId: appointmentCreated?.id_cita };
    } catch (error) {
      Logger.error('[ScheduleAppointmentUseCase] Error agendando cita:', error);
      return { success: false, message: 'No fue posible agendar la cita en este momento.' };
    }
  }
}
