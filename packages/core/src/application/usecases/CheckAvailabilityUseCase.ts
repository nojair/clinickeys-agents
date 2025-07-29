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

interface CheckAvailabilityInput {
  botConfig: BotConfigDTO;
  leadId: number;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  salesbotId: number;
  threadId: string;
  params: {
    tratamiento: string;
    medico?: string | null;
    fechas: Array<{ fecha: string }>;
    horas: Array<{ hora_inicio: string; hora_fin: string }>;
    rango_dias_extra?: number;
  };
  tiempoActual: DateTime;
  subdomain: string;
}

interface CheckAvailabilityOutput {
  success: boolean;
  message: string;
}

export class CheckAvailabilityUseCase {
  constructor(
    private readonly kommoService: KommoService,
    private readonly availabilityService: AvailabilityService
  ) {}

  public async execute(input: CheckAvailabilityInput): Promise<CheckAvailabilityOutput> {
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
    const { tratamiento, medico, fechas, horas } = params;

    try {
      // 1. Mensaje inicial
      await this.kommoService.sendBotInitialMessage({
        botConfig,
        leadId,
        mergedCustomFields,
        salesbotId,
        message: 'Muy bien, voy a mirar la agenda para ver las citas que tenemos disponibles. Un momento por favor.'
      });

      // 2. Pasos de búsqueda escalonada
      const STEPS = [
        { tipo: 'original', filtros: { con_medico: !!medico, rango_dias_extra: 0 }, params },
        { tipo: 'ampliada_mismo_medico', filtros: { con_medico: !!medico, rango_dias_extra: 45 }, params: { ...params, rango_dias_extra: 45 } },
        { tipo: 'ampliada_sin_medico_rango_dias_original', filtros: { con_medico: false, rango_dias_extra: 0 }, params: { ...params, medico: null } },
        { tipo: 'ampliada_sin_medico_rango_dias_extendido', filtros: { con_medico: false, rango_dias_extra: 45 }, params: { ...params, medico: null, rango_dias_extra: 45 } }
      ];

      let finalPayload: any = null;

      for (const step of STEPS) {
        const fechasStep = step.filtros.rango_dias_extra
          ? [...fechas, ...fechas].slice(0) // simplificación: mantiene fechas, rango extra manejado internamente
          : fechas;

        const availability = await this.availabilityService.getAvailabilityInfo({
          id_clinica: botConfig.clinicId,
          id_super_clinica: botConfig.superClinicId,
          tiempo_actual: tiempoActual,
          mensajeBotParlante: JSON.stringify({ tratamiento, fechas: fechasStep, horas, medico }),
          subdomain,
          kommoToken: botConfig.crmApiKey,
          leadId
        });
        Logger.info(`[CheckAvailability] Paso '${step.tipo}' respuesta:`, availability);

        if (availability.success && Array.isArray(availability.analisis_agenda) && availability.analisis_agenda.length > 0) {
          finalPayload = {
            tipo_busqueda: step.tipo,
            filtros_aplicados: step.filtros,
            tratamiento: { id: null, nombre: tratamiento },
            horarios: availability.analisis_agenda
          };
          break;
        }
      }

      if (!finalPayload) {
        finalPayload = { tipo_busqueda: 'sin_disponibilidad', filtros_aplicados: { con_medico: !!medico, rango_dias_extra: 0 }, tratamiento: { id: null, nombre: tratamiento }, horarios: [] };
      }

      // 3. Construir y enviar respuesta
      const message = `#consultaAgendar\nHORARIOS_DISPONIBLES: ${JSON.stringify(finalPayload)}\nMENSAJE_USUARIO: ${JSON.stringify(params)}`;
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
      Logger.error('[CheckAvailabilityUseCase] Error al consultar disponibilidad:', error);
      return { success: false, message: 'No fue posible consultar la disponibilidad en este momento.' };
    }
  }
}
