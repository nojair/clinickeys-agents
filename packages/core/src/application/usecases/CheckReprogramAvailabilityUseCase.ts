import { AvailabilityService, KommoService } from '@clinickeys-agents/core/application/services';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';

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
      mergedCustomFields,
      salesbotId,
      params,
      tiempoActual,
      subdomain,
    } = input;

    const { tratamiento, medico, id_medico, id_tratamiento, fechas, horas, citas_paciente } = params;

    // 1. Mensaje inicial "please‑wait"
    await this.kommoService.sendBotInitialMessage({
      botConfig,
      leadId,
      mergedCustomFields,
      salesbotId,
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
      Logger.info(`[CheckReprogramAvailability] Paso '${step.tipo}' respuesta:`, availability);

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
        break;
      }
    }

    if (!finalPayload) {
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

    return { success: true, toolOutput };
  }
}
