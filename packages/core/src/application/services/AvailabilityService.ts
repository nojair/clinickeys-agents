// packages/core/src/application/services/AvailabilityService.ts

import { generarConsultasSQL, calcularDisponibilidad, ajustarDisponibilidad } from "@clinickeys-agents/core/utils";
import { TratamientoRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/tratamiento";
import { EspacioRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/espacio";
import { MedicoRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/medico";
import { Logger } from "@clinickeys-agents/core/infrastructure/external/Logger";
import { OpenAIService } from '@clinickeys-agents/core/application/services';
import { ConsultaCitaSchema } from '@clinickeys-agents/core/utils/schemas';
import { ejecutarConReintento } from "@clinickeys-agents/core/utils";
import { AppError } from "@clinickeys-agents/core/utils/AppError";
import { readFile } from 'fs/promises';
import type { DateTime } from 'luxon';
import path from 'path';

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
  treatmentNames: string[];
}

export class AvailabilityService {
  private treatmentRepo: TratamientoRepositoryMySQL;
  private doctorRepo: MedicoRepositoryMySQL;
  private spaceRepo: EspacioRepositoryMySQL;
  private readonly openAIService: OpenAIService;

  constructor(
    treatmentRepo: TratamientoRepositoryMySQL,
    doctorRepo: MedicoRepositoryMySQL,
    spaceRepo: EspacioRepositoryMySQL,
    openAIService: OpenAIService
  ) {
    this.treatmentRepo = treatmentRepo;
    this.doctorRepo = doctorRepo;
    this.spaceRepo = spaceRepo;
    this.openAIService = openAIService
  }

  /**
   * Gets treatments with associated doctors and spaces, using advanced search by names.
   */
  async fetchTreatmentsWithDoctorsAndSpaces({ clinicId, treatmentNames }: GetTreatmentsDataInput): Promise<any[]> {
    Logger.info("Starting advanced treatment search...");
    const treatmentsFound = await this.treatmentRepo.findTreatmentsByNamesWithRelevance(treatmentNames, clinicId);
    if (!treatmentsFound.length) {
      Logger.warn("No treatments found in the database.");
      throw AppError.TRATAMIENTOS_NO_ENCONTRADOS(treatmentNames);
    }
    const exactTreatments = treatmentsFound.filter((t: any) => t.is_exact == 1);
    if (!exactTreatments.length) {
      Logger.warn("None of the treatments is an exact match.");
      throw AppError.TRATAMIENTOS_NO_EXACTOS(treatmentNames);
    }
    // For each exact treatment, get doctors and spaces
    const result = await Promise.all(
      exactTreatments.map(async (treatment: any) => {
        let doctors: any[] = [];
        try {
          doctors = await this.doctorRepo.getMedicosByTratamiento(treatment.id_tratamiento, clinicId);
        } catch (error) {
          Logger.error(`Error getting doctors for ${treatment.nombre_tratamiento}:`, error);
          throw AppError.ERROR_CONSULTA_SQL(error instanceof Error ? error : new Error(String(error)));
        }
        const doctorsWithSpaces = await Promise.all(
          doctors.map(async (doctor) => {
            let spaces: any[] = [];
            try {
              spaces = await this.spaceRepo.getEspaciosByMedicoAndTratamiento(doctor.id_medico, treatment.id_tratamiento, clinicId);
            } catch (error) {
              Logger.error(`Error getting spaces for doctor ${doctor.nombre_medico}:`, error);
              throw AppError.ERROR_CONSULTA_SQL(error instanceof Error ? error : new Error(String(error)));
            }
            return {
              id_medico: doctor.id_medico,
              nombre_medico: `${doctor.nombre_medico} ${doctor.apellido_medico}`,
              spaces,
            };
          })
        );
        return {
          treatment: {
            id_tratamiento: treatment.id_tratamiento,
            nombre_tratamiento: treatment.nombre_tratamiento,
            duracion_tratamiento: treatment.duracion,
          },
          doctors: doctorsWithSpaces,
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
        tratamientos: treatmentNames,
        medicos: doctorNames = [],
        fechas: selectedDates,
        id_clinica: clinicId,
        tiempo_actual: currentTime,
      } = input;
      // Basic validations
      if (!clinicId) throw AppError.FALTA_ID_CLINICA();
      if (!Array.isArray(treatmentNames) || treatmentNames.length === 0) throw AppError.NINGUN_TRATAMIENTO_SELECCIONADO();
      if (!Array.isArray(selectedDates) || selectedDates.length === 0) throw AppError.NINGUNA_FECHA_SELECCIONADA();
      Logger.info("Input data processed correctly.");
      // 1. Get base treatments
      let treatmentsData = await this.fetchTreatmentsWithDoctorsAndSpaces({ clinicId, treatmentNames });
      Logger.info("Treatments obtained:", JSON.stringify(treatmentsData));
      // 2. Optional: filter by doctors
      let requestedDoctorIds: number[] = [];
      let filteredTreatments = treatmentsData;
      if (doctorNames.length > 0) {
        const rows = await this.doctorRepo.getIdsMedicosPorNombre(doctorNames, clinicId);
        requestedDoctorIds = rows.map((f: any) => f.id_medico);
        if (requestedDoctorIds.length === 0) throw AppError.NINGUN_MEDICO_ENCONTRADO(doctorNames);
        const setIds = new Set(requestedDoctorIds);
        filteredTreatments = treatmentsData
          .map((t: any) => ({
            ...t,
            doctors: t.doctors.filter((m: any) => setIds.has(m.id_medico)),
          }))
          .filter((t: any) => t.doctors.length > 0);
        if (filteredTreatments.length === 0) {
          throw AppError.MEDICO_NO_ASOCIADO_A_TRATAMIENTO(doctorNames, treatmentNames);
        }
      }
      // 3. Collect doctor and space IDs
      const doctorIds = requestedDoctorIds.length
        ? requestedDoctorIds
        : [
            ...new Set(filteredTreatments.flatMap((t: any) => t.doctors.map((m: any) => m.id_medico)))
          ];
      const spaceIds = [
        ...new Set(
          filteredTreatments.flatMap((t: any) =>
            t.doctors.flatMap((m: any) => m.spaces.map((e: any) => e.id_espacio))
          )
        ),
      ];
      if (doctorIds.length === 0) {
        const treatmentNamesOut = filteredTreatments.map((t: any) => t.treatment.nombre_tratamiento);
        if (doctorNames.length > 0) throw AppError.MEDICO_NO_ASOCIADO_A_TRATAMIENTO(doctorNames, treatmentNames);
        else throw AppError.NINGUN_MEDICO_ENCONTRADO(treatmentNamesOut);
      }
      if (spaceIds.length === 0) {
        throw AppError.NINGUN_ESPACIO_ENCONTRADO(filteredTreatments.map((t: any) => t.treatment.nombre_tratamiento), doctorIds);
      }
      // 4. Generate SQL queries
      const consultasSQL = generarConsultasSQL({
        fechas: selectedDates,
        id_medicos: doctorIds,
        id_espacios: spaceIds,
        id_clinica: clinicId,
      });
      // 5. Execute queries
      let appointments, doctorSchedules, spaceSchedules, doctorSpaceSchedules;
      try {
        appointments = await ejecutarConReintento(consultasSQL.sql_citas, []);
        doctorSchedules = await ejecutarConReintento(consultasSQL.sql_prog_medicos, []);
        spaceSchedules = await ejecutarConReintento(consultasSQL.sql_prog_espacios, []);
        doctorSpaceSchedules = await ejecutarConReintento(consultasSQL.sql_prog_medico_espacio, []);
      } catch (error) {
        Logger.error("Error executing SQL queries:", error);
        throw AppError.ERROR_CONSULTA_SQL(error instanceof Error ? error : new Error(String(error)));
      }
      if (!doctorSchedules?.length) {
        throw AppError.NO_PROG_MEDICOS(doctorIds, selectedDates.map((f: any) => f.fecha));
      }
      if (!spaceSchedules?.length) {
        throw AppError.NO_PROG_ESPACIOS(spaceIds, selectedDates.map((f: any) => f.fecha));
      }
      // 6. Calculate availability
      let availability = calcularDisponibilidad({
        tratamientos: filteredTreatments,
        citas_programadas: appointments,
        prog_medicos: doctorSchedules,
        prog_espacios: spaceSchedules,
        prog_medico_espacio: doctorSpaceSchedules,
      });
      // 7. Final adjustment (currentTime)
      const adjustedAvailability = ajustarDisponibilidad(availability, currentTime);
      if (!adjustedAvailability.length) {
        throw AppError.SIN_HORARIOS_DISPONIBLES(treatmentNames, selectedDates);
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
    const promptsPath = path.resolve(__dirname, '../../.ia/instructions/prompts/bot_extractor_consulta_cita.md');
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
