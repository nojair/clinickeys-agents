// packages/core/src/application/usecases/ScheduleAppointmentUseCase.ts

import { KommoCustomFieldValueBase } from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import { isAppointmentSoon } from '@clinickeys-agents/core/utils';
import { readFile } from 'fs/promises';
import path from 'path';

import {
  formatFechaCita,
  PATIENT_FIRST_NAME,
  PATIENT_LAST_NAME,
  PATIENT_PHONE,
} from '@clinickeys-agents/core/utils';

import {
  KommoService,
  AppointmentService,
  AvailabilityService,
  PatientService,
  OpenAIService,
  PackBonoService,
} from '@clinickeys-agents/core/application/services';

interface ScheduleAppointmentInput {
  botConfig: any;
  leadId: number;
  normalizedLeadCF: (KommoCustomFieldValueBase & { value: any })[];
  params: {
    nombre: string;
    apellido: string;
    telefono: string;
    tratamiento: string;
    medico?: string | null;
    espacio?: string | null;
    fechas: string;
    horas: string;
    rango_dias_extra?: number;
    summary: string;
  };
  tiempoActual: any;
  subdomain: string;
}

interface ScheduleAppointmentOutput {
  success: boolean;
  toolOutput: string;
  customFields?: Record<string, string>;
  createdAppointmentId?: number;
  needsConfirmation?: boolean;
}

export class ScheduleAppointmentUseCase {
  constructor(
    private readonly kommoService: KommoService,
    private readonly appointmentService: AppointmentService,
    private readonly availabilityService: AvailabilityService,
    private readonly patientService: PatientService,
    private readonly openAIService: OpenAIService,
    private readonly packBonoService: PackBonoService,
  ) {}

  public async execute(input: ScheduleAppointmentInput): Promise<ScheduleAppointmentOutput> {
    const { botConfig, leadId, normalizedLeadCF, params, tiempoActual, subdomain } = input;
    const { nombre, apellido, telefono, tratamiento, medico, fechas, horas, summary } = params;

    Logger.info('[ScheduleAppointment] Inicio', { leadId, nombre, apellido, telefono, tratamiento, medico });

    // 1. Mensaje inicial "please‑wait"
    Logger.debug('[ScheduleAppointment] Enviando mensaje inicial al bot');
    await this.kommoService.sendBotInitialMessage({
      leadId,
      normalizedLeadCF,
      salesbotId: botConfig.kommo.salesbotId,
      message: 'Muy bien, voy a agendar tu cita. Un momento por favor.',
    });

    // 2. Obtener o crear paciente
    Logger.debug('[ScheduleAppointment] Obteniendo información del paciente');
    let patientInfo = await this.patientService.getPatientInfo(tiempoActual, botConfig.clinicId, {
      in_conversation: telefono,
      in_field: '',
      in_contact: '',
    });

    Logger.debug('=== [ScheduleAppointment] patientInfo ===', patientInfo);

    if (patientInfo.message?.includes('[ERROR_NO_PATIENT_FOUND]')) {
      Logger.warn('[ScheduleAppointment] Paciente no encontrado, creando nuevo paciente');
      const createdId = await this.patientService.createPatient({
        nombre,
        apellido,
        telefono,
        id_clinica: botConfig.clinicId,
        id_super_clinica: botConfig.superClinicId,
        kommo_lead_id: leadId,
      });
      patientInfo.paciente = { id_paciente: createdId };
      Logger.info(`[ScheduleAppointment] Paciente creado: ${createdId}`);
    }

    // 3. Estrategia escalonada
    const STEPS = [
      { tipo: 'original', filtros: { con_medico: !!medico, rango_dias_extra: 0 }, params: { ...params } },
      { tipo: 'ampliada_mismo_medico', filtros: { con_medico: !!medico, rango_dias_extra: 45 }, params: { ...params, rango_dias_extra: 45 } },
      { tipo: 'ampliada_sin_medico_rango_dias_original', filtros: { con_medico: false, rango_dias_extra: 0 }, params: { ...params, medico: null } },
      { tipo: 'ampliada_sin_medico_rango_dias_extendido', filtros: { con_medico: false, rango_dias_extra: 45 }, params: { ...params, medico: null, rango_dias_extra: 45 } },
    ];

    let finalPayload: any = null;
    let appointmentCreated: any = null;

    for (const step of STEPS) {
      Logger.debug('[ScheduleAppointment] Buscando disponibilidad', { step: step.tipo, filtros: step.filtros });
      const fechasStep = step.filtros.rango_dias_extra
        ? `${Array.isArray(fechas) ? JSON.stringify(fechas) : fechas}, los próximos 45 días`
        : fechas;

      const availability = await this.availabilityService.getAvailabilityInfo({
        id_clinica: botConfig.clinicId,
        id_super_clinica: botConfig.superClinicId,
        tiempo_actual: tiempoActual,
        mensajeBotParlante: JSON.stringify({
          tratamiento: step.params.tratamiento,
          fechas: fechasStep,
          horas,
          medico: step.params.medico,
          espacio: step.params.espacio,
        }),
        subdomain,
        kommoToken: botConfig.longLivedToken,
        leadId,
      });
      Logger.info('[ScheduleAppointment] Disponibilidad recibida', { success: availability.success, count: availability.analisis_agenda?.length });

      if (
        availability.success &&
        Array.isArray(availability.analisis_agenda) &&
        availability.analisis_agenda.length > 0
      ) {
        finalPayload = {
          tipo_busqueda: step.tipo,
          filtros_aplicados: step.filtros,
          tratamiento: { id: null, nombre: step.params.tratamiento },
          horarios: availability.analisis_agenda,
        };

        Logger.debug('[ScheduleAppointment] FinalPayload con horarios disponibles', { finalPayload });

        // Prompt extractor
        const extractorPrompt = `#agendarCita\n\nLos HORARIOS_DISPONIBLES para citas son: ${JSON.stringify(finalPayload)}\n\nMENSAJE_USUARIO: ${JSON.stringify(params)}`;
        Logger.debug('[ScheduleAppointment] Extractor prompt', extractorPrompt);
        const systemPrompt = await readFile(
          path.resolve(__dirname, 'packages/core/src/.ia/instructions/prompts/bot_extractor_de_datos.md'),
          'utf8',
        );
        const extractorData = await this.openAIService.getJsonStructuredResponse(
          systemPrompt,
          extractorPrompt,
        );
        Logger.debug('[ScheduleAppointment] Extractor de datos ejecutando', extractorData);

        if (extractorData.success) {
          Logger.debug('[ScheduleAppointment] Datos extraídos con éxito', { extractorData });
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
            p_hora_fin: extractorData.hora_fin,
            p_comentarios_cita: summary,
          });
          const id_cita = spResponse?.[0]?.[0]?.id_cita;

          if (id_cita) {
            Logger.info('[ScheduleAppointment] Cita creada', { id_cita });
            await this.packBonoService.procesarPackbonoPresupuestoDeCita('on_crear_cita', id_cita);
            appointmentCreated = { ...extractorData, id_cita };

            const isSoon = isAppointmentSoon(
              appointmentCreated.fecha_cita,
              tiempoActual,
              botConfig.timezone
            );
            appointmentCreated.isSoon = isSoon;

            finalPayload.needsConfirmation = isSoon;
            finalPayload.createdAppointmentId = id_cita;
          }
        } else {
          Logger.error('[ScheduleAppointment] Error al extraer datos con IA', { extractorData });
        }
        break;
      }
    }

    if (!finalPayload) {
      Logger.warn('[ScheduleAppointment] No se encontró disponibilidad en ningún paso');
      finalPayload = {
        tipo_busqueda: 'sin_disponibilidad',
        filtros_aplicados: { con_medico: !!medico, rango_dias_extra: 0 },
        tratamiento: { id: null, nombre: tratamiento },
        horarios: [],
      };
    }

    // 4. Construir toolOutput según resultado
    let toolOutput: string;
    if (appointmentCreated?.id_cita) {
      const fechaLegible = formatFechaCita(appointmentCreated.fecha_cita);
      const doctorLine =
        medico && appointmentCreated.nombre_medico
          ? `\n- El médico es “${appointmentCreated.nombre_medico} ${appointmentCreated.apellido_medico}”.`
          : '';
      toolOutput = `#agendarCita\n- La cita de “${appointmentCreated.nombre_tratamiento}” ha sido agendada para el ${fechaLegible} a las ${appointmentCreated.hora_inicio}.${doctorLine}`;
    } else if (finalPayload.horarios.length === 0) {
      toolOutput =
        '#agendarCita\nLo siento, en este momento no hay horarios disponibles para el día solicitado. ¿Te gustaría buscar otro día o franja horaria?';
    } else {
      toolOutput = `#agendarCita\nLo siento, parece que ocurrió un problema. Por favor, ¿Podrías repetirnos tu horario o escoger otro?`;
    }

    const customFields = {
      [PATIENT_FIRST_NAME]: nombre,
      [PATIENT_LAST_NAME]: apellido,
      [PATIENT_PHONE]: telefono,
    };

    Logger.info('[ScheduleAppointment] Ejecución completada', { success: true });

    return {
      success: true,
      toolOutput,
      customFields,
      createdAppointmentId: appointmentCreated?.id_cita,
      needsConfirmation: appointmentCreated?.isSoon || false,
    };
  }
}
