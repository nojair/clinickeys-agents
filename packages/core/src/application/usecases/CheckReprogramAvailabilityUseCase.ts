import type { DateTime } from 'luxon';
import type { BotConfigDTO } from '@clinickeys-agents/core/domain/botConfig';
import { KommoService } from '@clinickeys-agents/core/application/services/KommoService';
import { AvailabilityService } from '@clinickeys-agents/core/application/services/AvailabilityService';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import {
  PATIENT_MESSAGE,
  REMINDER_MESSAGE,
  PLEASE_WAIT_MESSAGE,
  BOT_MESSAGE,
  THREAD_ID
} from '@clinickeys-agents/core/utils/constants';

interface CheckReprogramAvailabilityInput {
  botConfig: BotConfigDTO;
  leadId: number;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  salesbotId: number;
  threadId: string;
  params: {
    id_cita: number;
    id_tratamiento: string;
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

interface CheckReprogramAvailabilityOutput {
  success: boolean;
  message: string;
}

export class CheckReprogramAvailabilityUseCase {
  constructor(
    private readonly kommoService: KommoService,
    private readonly availabilityService: AvailabilityService
  ) {}

  public async execute(
    input: CheckReprogramAvailabilityInput
  ): Promise<CheckReprogramAvailabilityOutput> {
    const {
      botConfig,
      leadId,
      mergedCustomFields,
      salesbotId,
      threadId,
      params,
      tiempoActual,
      subdomain
    } = input;
    const { tratamiento, medico, id_medico, fechas } = params;

    try {
      // 1. Mensaje inicial
      await this.kommoService.sendBotInitialMessage({
        botConfig,
        leadId,
        mergedCustomFields,
        salesbotId,
        message: 'Muy bien, voy a revisar los horarios. Un momento por favor.'
      });

      // 2. Pasos de búsqueda escalonada
      const STEPS = [
        { tipo: 'original', filtros: { con_medico: true, rango_dias_extra: 0 }, params },
        { tipo: 'ampliada_mismo_medico', filtros: { con_medico: true, rango_dias_extra: 45 }, params: { ...params, rango_dias_extra: 45 } },
        { tipo: 'ampliada_sin_medico_rango_dias_original', filtros: { con_medico: false, rango_dias_extra: 0 }, params: { ...params, medico: null, id_medico: null } },
        { tipo: 'ampliada_sin_medico_rango_dias_extendido', filtros: { con_medico: false, rango_dias_extra: 45 }, params: { ...params, medico: null, id_medico: null, rango_dias_extra: 45 } }
      ];

      let finalPayload: any = null;

      for (const step of STEPS) {
        const fechasStep = step.filtros.rango_dias_extra
          ? fechas
          : fechas;

        const availability = await this.availabilityService.getAvailabilityInfo({
          id_clinica: botConfig.clinicId,
          id_super_clinica: botConfig.superClinicId,
          tiempo_actual: tiempoActual,
          mensajeBotParlante: JSON.stringify({
            id_tratamiento: step.params.id_tratamiento,
            tratamiento: step.params.tratamiento,
            fechas: fechasStep,
            horas: step.params.horas,
            medico: step.params.medico,
            id_medico: step.params.id_medico
          }),
          subdomain,
          kommoToken: botConfig.crmApiKey,
          leadId
        });
        Logger.info(`[CheckReprogramAvailability] Paso '${step.tipo}' respuesta:`, availability);

        if (availability.success && Array.isArray(availability.analisis_agenda) && availability.analisis_agenda.length > 0) {
          finalPayload = {
            tipo_busqueda: step.tipo,
            filtros_aplicados: step.filtros,
            tratamiento: { id: step.params.id_medico ?? null, nombre: step.params.tratamiento },
            horarios: availability.analisis_agenda
          };
          break;
        }
      }

      if (!finalPayload) {
        finalPayload = {
          tipo_busqueda: 'sin_disponibilidad',
          filtros_aplicados: { con_medico: !!medico, rango_dias_extra: 0 },
          tratamiento: { id: id_medico ?? null, nombre: tratamiento },
          horarios: []
        };
      }

      // 3. Construir mensaje con citas del paciente y horarios
      const citasPaciente = JSON.stringify(params.citas_paciente || []);
      const message = `#consultaReprogramar
CITAS_PACIENTE: ${citasPaciente}
HORARIOS_DISPONIBLES: ${JSON.stringify(finalPayload)}
MENSAJE_USUARIO: ${JSON.stringify(params)}`;
      const customFields: Record<string, string> = {
        [PATIENT_MESSAGE]: '',
        [REMINDER_MESSAGE]: '',
        [PLEASE_WAIT_MESSAGE]: 'false',
        [BOT_MESSAGE]: message,
        [THREAD_ID]: threadId
      };

      await this.kommoService.replyToLead({
        botConfig,
        leadId,
        customFields,
        mergedCustomFields,
        salesbotId
      });

      return { success: true, message };
    } catch (error) {
      Logger.error('[CheckReprogramAvailabilityUseCase] Error al consultar disponibilidad para reprogramar:', error);
      return {
        success: false,
        message: 'No fue posible consultar los horarios para reprogramar en este momento.'
      };
    }
  }
}
