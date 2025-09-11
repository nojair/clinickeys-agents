import { KommoCustomFieldValueBase } from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import { AvailabilityService, KommoService } from '@clinickeys-agents/core/application/services';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import { BotConfigDTO } from '@clinickeys-agents/core/domain/botConfig';
import { getActualTimeForPrompts } from '@clinickeys-agents/core/utils';
import type { DateTime } from 'luxon';

interface CheckAvailabilityInput {
  botConfig: BotConfigDTO;
  leadId: number;
  normalizedLeadCF: (KommoCustomFieldValueBase & { value: any })[];
  params: {
    tratamiento: string;
    medico?: string | null;
    espacio?: string | null;
    fechas: string;
    horas: string;
    rango_dias_extra?: number;
  };
  timezone: string;
  tiempoActualDT: DateTime;
  subdomain: string;
}

interface CheckAvailabilityOutput {
  success: boolean;
  toolOutput: string;
  customFields?: Record<string, string>;
}

export class CheckAvailabilityUseCase {
  constructor(
    private readonly kommoService: KommoService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  public async execute(input: CheckAvailabilityInput): Promise<CheckAvailabilityOutput> {
    const { botConfig, leadId, normalizedLeadCF, params, timezone, tiempoActualDT, subdomain } = input;
    const { tratamiento, medico, fechas, horas } = params;

    Logger.info('[CheckAvailability] Inicio', { leadId, tratamiento, medico, fechas, horas });

    // 1. Mensaje inicial "please‑wait"
    Logger.debug('[CheckAvailability] Enviando mensaje inicial al bot');
    await this.kommoService.sendBotInitialMessage({
      leadId,
      normalizedLeadCF,
      salesbotId: botConfig.kommo.salesbotId,
      message: 'Muy bien, voy a mirar la agenda para ver las citas que tenemos disponibles. Un momento por favor.',
    });

    // 2. Estrategia escalonada
    const STEPS = [
      { tipo: 'original', filtros: { con_medico: !!medico, rango_dias_extra: 0 }, params: { ...params } },
      { tipo: 'ampliada_mismo_medico', filtros: { con_medico: !!medico, rango_dias_extra: 45 }, params: { ...params, rango_dias_extra: 45 } },
      { tipo: 'ampliada_sin_medico_rango_dias_original', filtros: { con_medico: false, rango_dias_extra: 0 }, params: { ...params, medico: null } },
      { tipo: 'ampliada_sin_medico_rango_dias_extendido', filtros: { con_medico: false, rango_dias_extra: 45 }, params: { ...params, medico: null, rango_dias_extra: 45 } },
    ];

    let finalPayload: any = null;

    for (const step of STEPS) {
      Logger.debug('[CheckAvailability] Buscando disponibilidad', { step: step.tipo, filtros: step.filtros });
      const fechasStep = step.filtros.rango_dias_extra
        ? `${Array.isArray(fechas) ? JSON.stringify(fechas) : fechas}, los próximos 45 días`
        : fechas;

      const availability = await this.availabilityService.getAvailabilityInfo({
        id_clinica: botConfig.clinicId,
        id_super_clinica: botConfig.superClinicId,
        tiempo_actual: tiempoActualDT.toISO() as string,
        mensajeBotParlante: JSON.stringify({
          tratamiento,
          fechas: fechasStep,
          horas,
          medico: step.params.medico,
          espacio: step.params.espacio,
        }),
        subdomain,
        kommoToken: botConfig.kommo.longLivedToken,
        leadId,
      });
      Logger.info(`[CheckAvailability] Paso '${step.tipo}' respuesta recibida`, { success: availability.success, count: availability.analisis_agenda?.length });

      if (
        availability.success &&
        Array.isArray(availability.analisis_agenda) &&
        availability.analisis_agenda.length > 0
      ) {
        finalPayload = {
          tipo_busqueda: step.tipo,
          filtros_aplicados: step.filtros,
          tratamiento: { id: null, nombre: tratamiento },
          horarios: availability.analisis_agenda,
        };
        Logger.debug('[CheckAvailability] Disponibilidad encontrada', { finalPayload });
        break;
      }
    }

    if (!finalPayload) {
      Logger.warn('[CheckAvailability] No se encontró disponibilidad en ningún paso');
      finalPayload = {
        tipo_busqueda: 'sin_disponibilidad',
        filtros_aplicados: { con_medico: !!medico, rango_dias_extra: 0 },
        tratamiento: { id: null, nombre: tratamiento },
        horarios: [],
      };
    }

    // 3. Construir toolOutput
    const actualTimeForPrompts = getActualTimeForPrompts(tiempoActualDT, timezone);
    const toolOutput = `#consultaAgendar\nTIEMPO_ACTUAL: ${actualTimeForPrompts}\nHORARIOS_DISPONIBLES: ${JSON.stringify(finalPayload)}\nMENSAJE_USUARIO: ${JSON.stringify(params)}`;
    Logger.info('[CheckAvailability] Ejecución completada', { success: true });

    return { success: true, toolOutput };
  }
}
