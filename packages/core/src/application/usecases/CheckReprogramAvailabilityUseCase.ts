import { KommoCustomFieldValueBase } from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import { AvailabilityService, KommoService } from '@clinickeys-agents/core/application/services';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';

interface CheckReprogramAvailabilityInput {
  botConfig: any;
  leadId: number;
  normalizedLeadCF: (KommoCustomFieldValueBase & { value: any })[];
  params: {
    id_cita: number;
    id_tratamiento: number;
    tratamiento: string;
    medico?: string | null;
    id_medico?: number | null;
    fechas: string;
    horas: string;
    rango_dias_extra?: number;
    citas_paciente?: Array<{ id_cita: number; [key: string]: any }>;
  };
  tiempoActual: any;
  subdomain: string;
}

interface CheckReprogramAvailabilityOutput {
  success: boolean;
  toolOutput: string;
  customFields?: Record<string, string>;
}

export class CheckReprogramAvailabilityUseCase {
  constructor(
    private readonly kommoService: KommoService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  public async execute(input: CheckReprogramAvailabilityInput): Promise<CheckReprogramAvailabilityOutput> {
    const {
      botConfig,
      leadId,
      normalizedLeadCF,
      params,
      tiempoActual,
      subdomain,
    } = input;

    const { tratamiento, medico, id_medico, id_tratamiento, fechas, horas, citas_paciente } = params;

    Logger.info('[CheckReprogramAvailability] Inicio', { leadId, tratamiento, medico, id_medico, fechas, horas });

    // 1. Mensaje inicial "please-wait"
    Logger.debug('[CheckReprogramAvailability] Enviando mensaje inicial al bot');
    await this.kommoService.sendBotInitialMessage({
      leadId,
      normalizedLeadCF,
      salesbotId: botConfig.kommo.salesbotId,
      message: 'Muy bien, voy a revisar los horarios. Un momento por favor.',
    });

    // 2. Estrategia escalonada de disponibilidad
    const STEPS = [
      { tipo: 'original', filtros: { con_medico: true, rango_dias_extra: 0 }, params: { ...params } },
      { tipo: 'ampliada_mismo_medico', filtros: { con_medico: true, rango_dias_extra: 45 }, params: { ...params, rango_dias_extra: 45 } },
      { tipo: 'ampliada_sin_medico_rango_dias_original', filtros: { con_medico: false, rango_dias_extra: 0 }, params: { ...params, medico: null, id_medico: null } },
      { tipo: 'ampliada_sin_medico_rango_dias_extendido', filtros: { con_medico: false, rango_dias_extra: 45 }, params: { ...params, medico: null, id_medico: null, rango_dias_extra: 45 } },
    ];

    let finalPayload: any = null;

    for (const step of STEPS) {
      Logger.debug('[CheckReprogramAvailability] Buscando disponibilidad', { step: step.tipo, filtros: step.filtros });
      const fechasStep = step.filtros.rango_dias_extra
        ? `${Array.isArray(fechas) ? JSON.stringify(fechas) : fechas}, los próximos 45 días`
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
          id_medico: step.params.id_medico,
        }),
        subdomain,
        kommoToken: botConfig.longLivedToken,
        leadId,
      });
      Logger.info(`[CheckReprogramAvailability] Paso '${step.tipo}' respuesta recibida`, { success: availability.success, count: availability.analisis_agenda?.length });

      if (
        availability.success &&
        Array.isArray(availability.analisis_agenda) &&
        availability.analisis_agenda.length > 0
      ) {
        finalPayload = {
          tipo_busqueda: step.tipo,
          filtros_aplicados: step.filtros,
          tratamiento: {
            id: step.params.id_tratamiento ?? null,
            nombre: step.params.tratamiento,
          },
          horarios: availability.analisis_agenda,
        };
        Logger.debug('[CheckReprogramAvailability] Disponibilidad encontrada', { finalPayload });
        break;
      }
    }

    if (!finalPayload) {
      Logger.warn('[CheckReprogramAvailability] No se encontró disponibilidad en ningún paso');
      finalPayload = {
        tipo_busqueda: 'sin_disponibilidad',
        filtros_aplicados: { con_medico: !!medico, rango_dias_extra: 0 },
        tratamiento: { id: id_tratamiento ?? null, nombre: tratamiento },
        horarios: [],
      };
    }

    // 3. Construir toolOutput para resolver run
    const citasPacienteStr = JSON.stringify(citas_paciente ?? []);
    const toolOutput = `#consultaReprogramar\nCITAS_PACIENTE: ${citasPacienteStr}\nHORARIOS_DISPONIBLES: ${JSON.stringify(finalPayload)}\nMENSAJE_USUARIO: ${JSON.stringify(params)}`;
    Logger.info('[CheckReprogramAvailability] Ejecución completada', { success: true });

    return { success: true, toolOutput };
  }
}
