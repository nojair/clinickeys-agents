// packages/core/src/application/services/AvailabilityService.ts

import { generarConsultasSQL, calcularDisponibilidad, ajustarDisponibilidad } from "@clinickeys-agents/core/utils";
import { ejecutarConReintento } from "@clinickeys-agents/core/infrastructure/helpers";
import { ITratamientoRepository } from "@clinickeys-agents/core/domain/tratamiento";
import { IEspacioRepository } from "@clinickeys-agents/core/domain/espacio";
import { IMedicoRepository } from "@clinickeys-agents/core/domain/medico";
import { Logger } from "@clinickeys-agents/core/infrastructure/external";
import { IOpenAIService } from '@clinickeys-agents/core/domain/openai';
import { ConsultaCitaSchema } from '@clinickeys-agents/core/utils';
import { AppError } from "@clinickeys-agents/core/utils";
import { readFile } from 'fs/promises';
import path from 'path';

import type { DateTime } from 'luxon';

interface GetAvailabilityInfoInput {
  id_clinica: number;
  id_super_clinica: number;
  tiempo_actual: DateTime;
  mensajeBotParlante: string;
  subdomain: string;
  kommoToken: string;
  leadId?: number;
}

export interface GetTreatmentsDataInput {
  clinicId: number;
  tratamientosConsultados: string[];
}

export class AvailabilityService {
  private treatmentRepo: ITratamientoRepository;
  private doctorRepo: IMedicoRepository;
  private spaceRepo: IEspacioRepository;
  private readonly openAIService: IOpenAIService;

  constructor(
    treatmentRepo: ITratamientoRepository,
    doctorRepo: IMedicoRepository,
    spaceRepo: IEspacioRepository,
    openAIService: IOpenAIService
  ) {
    this.treatmentRepo = treatmentRepo;
    this.doctorRepo = doctorRepo;
    this.spaceRepo = spaceRepo;
    this.openAIService = openAIService
  }

  /**
   * Gets treatments with associated medicos and espacios, using advanced search by names.
   */
  async fetchTreatmentsWithDoctorsAndSpaces({ clinicId, tratamientosConsultados }: GetTreatmentsDataInput): Promise<any[]> {
    Logger.info("Starting advanced tratamiento search...");
    const treatmentsFound = await this.treatmentRepo.findTreatmentsByNamesWithRelevance(tratamientosConsultados, clinicId);
    if (!treatmentsFound.length) {
      Logger.warn("No treatments found in the database.");
      throw AppError.TRATAMIENTOS_NO_ENCONTRADOS(tratamientosConsultados);
    }
    const tratamientosExactos = treatmentsFound.filter((t: any) => t.is_exact == 1);
    if (!tratamientosExactos.length) {
      Logger.warn("None of the treatments is an exact match.");
      throw AppError.TRATAMIENTOS_NO_EXACTOS(tratamientosConsultados);
    }
    // For each exact tratamiento, get medicos and espacios
    const result = await Promise.all(
      tratamientosExactos.map(async (tratamiento: any) => {
        let medicos: any[] = [];
        try {
          medicos = await this.doctorRepo.getMedicosByTratamiento(tratamiento.id_tratamiento, clinicId);
        } catch (error) {
          Logger.error(`Error getting medicos for ${tratamiento.nombre_tratamiento}:`, error);
          throw AppError.ERROR_CONSULTA_SQL(error instanceof Error ? error : new Error(String(error)));
        }
        const medicosConEspacios = await Promise.all(
          medicos.map(async (medico) => {
            let espacios: any[] = [];
            try {
              espacios = await this.spaceRepo.getEspaciosByMedicoAndTratamiento(medico.id_medico, tratamiento.id_tratamiento, clinicId);
            } catch (error) {
              Logger.error(`Error getting espacios for medico ${medico.nombre_medico}:`, error);
              throw AppError.ERROR_CONSULTA_SQL(error instanceof Error ? error : new Error(String(error)));
            }
            return {
              id_medico: medico.id_medico,
              nombre_medico: `${medico.nombre_medico}`,
              espacios,
            };
          })
        );
        return {
          tratamiento: {
            id_tratamiento: tratamiento.id_tratamiento,
            nombre_tratamiento: tratamiento.nombre_tratamiento,
            duracion_tratamiento: tratamiento.duracion,
          },
          medicos: medicosConEspacios,
        };
      })
    );
    return result;
  }

  /**
   * Orchestrates getting appointment availability from user input.
   */
  async getAppointmentAvailability(input: any): Promise<any> {
    try {
      const {
        tratamientos: tratamientosConsultados,
        medicos: medicosConsultados = [],
        fechas: fechasSeleccionadas,
        id_clinica: clinicId,
        tiempo_actual: tiempo_actual,
      } = input;
      // Basic validations
      if (!clinicId) throw AppError.FALTA_ID_CLINICA();
      if (!Array.isArray(tratamientosConsultados) || tratamientosConsultados.length === 0) throw AppError.NINGUN_TRATAMIENTO_SELECCIONADO();
      if (!Array.isArray(fechasSeleccionadas) || fechasSeleccionadas.length === 0) throw AppError.NINGUNA_FECHA_SELECCIONADA();
      Logger.info("Input data processed correctly.");
      // 1. Get base treatments
      let datosTratamientos = await this.fetchTreatmentsWithDoctorsAndSpaces({ clinicId, tratamientosConsultados });
      Logger.info("Treatments obtained:", JSON.stringify(datosTratamientos));
      // 2. Optional: filter by medicos
      let idsMedicosSolicitados: number[] = [];
      let tratamientosFiltrados = datosTratamientos;
      if (medicosConsultados.length > 0) {
        const rows = await this.doctorRepo.getIdsMedicosPorNombre(medicosConsultados, clinicId);
        idsMedicosSolicitados = rows.map((f: any) => f.id_medico);
        if (idsMedicosSolicitados.length === 0) throw AppError.MEDICOS_SOLICITADOS_NO_ENCONTRADOS(medicosConsultados);
        const setIds = new Set(idsMedicosSolicitados);
        tratamientosFiltrados = datosTratamientos
          .map((t: any) => ({
            ...t,
            medicos: t.medicos.filter((m: any) => setIds.has(m.id_medico)),
          }))
          .filter((t: any) => t.medicos.length > 0);
        if (tratamientosFiltrados.length === 0) {
          throw AppError.MEDICO_NO_ASOCIADO_A_TRATAMIENTO(medicosConsultados, tratamientosConsultados);
        }
      }
      // 3. Collect medico and space IDs
      const idsMedicos = idsMedicosSolicitados.length
        ? idsMedicosSolicitados
        : [
            ...new Set(tratamientosFiltrados.flatMap((t: any) => t.medicos.map((m: any) => m.id_medico)))
          ];
      const idsEspacios = [
        ...new Set(
          tratamientosFiltrados.flatMap((t: any) =>
            t.medicos.flatMap((m: any) => m.espacios.map((e: any) => e.id_espacio))
          )
        ),
      ];
      if (idsMedicos.length === 0) {
        const treatmentNamesOut = tratamientosFiltrados.map((t: any) => t.tratamiento.nombre_tratamiento);
        if (medicosConsultados.length > 0) throw AppError.MEDICO_NO_ASOCIADO_A_TRATAMIENTO(medicosConsultados, tratamientosConsultados);
        else throw AppError.NINGUN_MEDICO_ENCONTRADO(treatmentNamesOut);
      }
      if (idsEspacios.length === 0) {
        throw AppError.NINGUN_ESPACIO_ENCONTRADO(tratamientosFiltrados.map((t: any) => t.tratamiento.nombre_tratamiento), idsMedicos);
      }
      // 4. Generate SQL queries
      const consultasSQL = generarConsultasSQL({
        fechas: fechasSeleccionadas,
        id_medicos: idsMedicos,
        id_espacios: idsEspacios,
        id_clinica: clinicId,
      });
      // 5. Execute queries
      let citas, progMedicos, progEspacios, progMedicoEspacio;
      try {
        citas = await ejecutarConReintento(consultasSQL.sql_citas, []);
        progMedicos = await ejecutarConReintento(consultasSQL.sql_prog_medicos, []);
        progEspacios = await ejecutarConReintento(consultasSQL.sql_prog_espacios, []);
        progMedicoEspacio = await ejecutarConReintento(consultasSQL.sql_prog_medico_espacio, []);
      } catch (error) {
        Logger.error("Error executing SQL queries:", error);
        throw AppError.ERROR_CONSULTA_SQL(error instanceof Error ? error : new Error(String(error)));
      }
      if (!progMedicos?.length) {
        throw AppError.NO_PROG_MEDICOS(idsMedicos, fechasSeleccionadas.map((f: any) => f.fecha));
      }
      if (!progEspacios?.length) {
        throw AppError.NO_PROG_ESPACIOS(idsEspacios, fechasSeleccionadas.map((f: any) => f.fecha));
      }
      // 6. Calculate availability
      let availability = calcularDisponibilidad({
        tratamientos: tratamientosFiltrados,
        citas_programadas: citas,
        prog_medicos: progMedicos,
        prog_espacios: progEspacios,
        prog_medico_espacio: progMedicoEspacio,
      });
      // 7. Final adjustment (tiempo_actual)
      const adjustedAvailability = ajustarDisponibilidad(availability, tiempo_actual);
      if (!adjustedAvailability.length) {
        throw AppError.SIN_HORARIOS_DISPONIBLES(tratamientosConsultados, fechasSeleccionadas);
      }
      Logger.info("Final adjusted availability:", adjustedAvailability);
      return {
        success: true,
        message: null,
        analisis_agenda: adjustedAvailability,
      };
    } catch (e: any) {
      Logger.error("Error in getAppointmentAvailability:", e);
      if (e instanceof AppError) {
        if (e.isLogOnly) {
          return {
            success: true,
            message: e.message,
            analisis_agenda: [],
          };
        }
        return {
          success: false,
          message: e.message,
          analisis_agenda: [],
        };
      }
      Logger.error("Unhandled error:", e);
      const ed = AppError.ERROR_DESCONOCIDO(e);
      return {
        success: false,
        message: ed.message,
        analisis_agenda: [],
      };
    }
  }

  /**
   * Interpreta el mensaje del usuario para consultar disponibilidad
   * y delega al cálculo puro de disponibilidad.
   */
  public async getAvailabilityInfo(input: GetAvailabilityInfoInput): Promise<{ success: boolean; message: string | null; analisis_agenda: any[] | null }> {
    const { id_clinica, id_super_clinica, tiempo_actual, mensajeBotParlante } = input;

    // 1. Datos de contexto: tratamientos y médicos
    const tratamientos = await this.treatmentRepo.getActiveTreatmentsForClinic(id_clinica, id_super_clinica);
    const nombresTratamientos = tratamientos.map(t => t.nombre_tratamiento);
    const medicos = await this.doctorRepo.getMedicos(id_clinica, id_super_clinica);
    const nombresMedicos = medicos.map(m => m.nombre_medico);

    // 2. Construir prompt para OpenAI
    const consultAgendaMessage = `
El paciente consultó por una cita y le respondimos esto: ${mensajeBotParlante}

Contexto:
- id_clinica: ${id_clinica}
- id_super_clinica: ${id_super_clinica}
- tiempo_actual: ${tiempo_actual}
- tratamientos disponibles: ${JSON.stringify(nombresTratamientos)}
- médicos disponibles: ${JSON.stringify(nombresMedicos)}
`;
    Logger.info('[AvailabilityService] Prompt de consulta de agenda:', consultAgendaMessage);

    // 3. Cargar instrucciones del sistema
    const promptsPath = path.resolve(__dirname, 'packages/core/src/.ia/instructions/prompts/bot_extractor_consulta_cita.md');
    const systemPrompt = await readFile(promptsPath, 'utf8');

    // 4. Obtener filtros estructurados desde OpenAI
    const { filters } = await this.openAIService.getSchemaStructuredResponse(
      systemPrompt,
      consultAgendaMessage,
      ConsultaCitaSchema,
      'consultaCitaSchema'
    );
    Logger.info('[AvailabilityService] Filtros obtenidos:', JSON.stringify(filters));

    // 5. Preparar payload para cálculo de disponibilidad
    const lambdaBody = {
      tratamientos: filters[0]?.tratamientos ?? [],
      medicos: filters[0]?.medicos ?? [],
      fechas: filters[0]?.fechas ?? [],
      id_clinica,
      tiempo_actual
    };

    if (lambdaBody.tratamientos.length === 0) {
      return {
        success: false,
        message: 'No se encontraron tratamientos disponibles en la clínica.',
        analisis_agenda: null
      };
    }

    // 6. Delegar al core de disponibilidad
    return this.getAppointmentAvailability(lambdaBody);
  }
}
