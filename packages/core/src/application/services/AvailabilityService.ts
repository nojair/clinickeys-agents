// @clinickeys-agents/core/src/application/services/AvailabilityService.ts

import { TratamientoRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/tratamiento/TratamientoRepositoryMySQL";
import { MedicoRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/medico/MedicoRepositoryMySQL";
import { EspacioRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/espacio/EspacioRepositoryMySQL";
import { ejecutarConReintento } from "@clinickeys-agents/core/utils";
import { Logger } from "@clinickeys-agents/core/infrastructure/external/Logger";
import { AppError } from "@clinickeys-agents/core/utils/AppError";
import { generarConsultasSQL } from "@clinickeys-agents/core/utils/availabilityHelpers";
import { calcularDisponibilidad } from "@clinickeys-agents/core/utils/availabilityHelpers";
import { ajustarDisponibilidad } from "@clinickeys-agents/core/utils/availabilityHelpers";

export interface ObtenerDatosTratamientosInput {
  id_clinica: number;
  tratamientosConsultados: string[];
}

export class AvailabilityService {
  private tratamientoRepo: TratamientoRepositoryMySQL;
  private medicoRepo: MedicoRepositoryMySQL;
  private espacioRepo: EspacioRepositoryMySQL;

  constructor(
    tratamientoRepo: TratamientoRepositoryMySQL,
    medicoRepo: MedicoRepositoryMySQL,
    espacioRepo: EspacioRepositoryMySQL
  ) {
    this.tratamientoRepo = tratamientoRepo;
    this.medicoRepo = medicoRepo;
    this.espacioRepo = espacioRepo;
  }

  /**
   * Obtiene datos de tratamientos con médicos y espacios asociados,
   * siguiendo lógica de negocio compuesta.
   */
  async obtenerDatosTratamientos({ id_clinica, tratamientosConsultados }: ObtenerDatosTratamientosInput): Promise<any[]> {
    Logger.info("Iniciando la consulta de tratamientos...");
    // Consulta avanzada con LIKE/MATCH para todos los tratamientos buscados
    const matchAgainst = tratamientosConsultados.join(" ");
    const marcadoresExactos = tratamientosConsultados.map(() => "LOWER(TRIM(?))").join(", ");
    const consultaSQL = `
      SELECT DISTINCT
          id_tratamiento,
          nombre_tratamiento,
          duracion AS duracion_tratamiento,
          MATCH(nombre_tratamiento, descripcion) AGAINST(?) AS relevancia,
          (CASE
              WHEN LOWER(TRIM(nombre_tratamiento)) IN (${marcadoresExactos}) THEN 1
              ELSE 0
           END) AS es_exacto
      FROM tratamientos
      WHERE MATCH(nombre_tratamiento, descripcion) AGAINST(?)
        AND id_clinica = ?
      ORDER BY es_exacto DESC, relevancia DESC, nombre_tratamiento ASC
    `;
    const parametros = [
      matchAgainst,
      ...tratamientosConsultados.map((tc) => tc.toLowerCase().trim()),
      matchAgainst,
      id_clinica,
    ];
    let tratamientosEncontrados;
    try {
      tratamientosEncontrados = await ejecutarConReintento(consultaSQL, parametros);
    } catch (error) {
      if (error instanceof Error) {
        throw AppError.ERROR_CONSULTA_SQL(error);
      } else {
        throw AppError.ERROR_CONSULTA_SQL(new Error(String(error)));
      }
    }

    if (!tratamientosEncontrados.length) {
      Logger.warn("No se encontraron tratamientos en la base de datos.");
      throw AppError.TRATAMIENTOS_NO_ENCONTRADOS(tratamientosConsultados);
    }
    const tratamientosExactos = tratamientosEncontrados.filter((ft: any) => ft.es_exacto == 1);
    if (!tratamientosExactos.length) {
      Logger.warn("Ninguno de los tratamientos es exacto.");
      throw AppError.TRATAMIENTOS_NO_EXACTOS(tratamientosConsultados);
    }
    // Por cada tratamiento exacto, obtener médicos y espacios
    const resultadoFinal = await Promise.all(
      tratamientosExactos.map(async (tratamiento: any) => {
        let medicos: any[] = [];
        try {
          medicos = await this.medicoRepo.getMedicosByTratamiento(tratamiento.id_tratamiento, id_clinica);
        } catch (error) {
          Logger.error(`Error al obtener médicos para ${tratamiento.nombre_tratamiento}:`, error);
          if (!(error instanceof AppError)) {
            // Aseguramos el tipo Error
            const err = error instanceof Error ? error : new Error(String(error));
            throw AppError.ERROR_CONSULTA_SQL(err);
          }
          throw error;
        }

        const medicosConEspacios = await Promise.all(
          medicos.map(async (medico) => {
            let espacios: any[] = [];
            try {
              espacios = await this.espacioRepo.getEspaciosByMedicoAndTratamiento(medico.id_medico, tratamiento.id_tratamiento, id_clinica);
            } catch (error) {
              Logger.error(`Error al obtener espacios para el médico ${medico.nombre_medico}:`, error);
              if (!(error instanceof AppError)) {
                const err = error instanceof Error ? error : new Error(String(error));
                throw AppError.ERROR_CONSULTA_SQL(err);
              }
              throw error;
            }

            return {
              id_medico: medico.id_medico,
              nombre_medico: `${medico.nombre_medico} ${medico.apellido_medico}`,
              espacios,
            };
          })
        );
        return {
          tratamiento: {
            id_tratamiento: tratamiento.id_tratamiento,
            nombre_tratamiento: tratamiento.nombre_tratamiento,
            duracion_tratamiento: tratamiento.duracion_tratamiento,
          },
          medicos: medicosConEspacios,
        };
      })
    );
    return resultadoFinal;
  }

  /**
   * Orquesta la obtención de la disponibilidad de citas a partir de un mensaje de usuario.
   */
  async getAppointmentAvailabilityFromUserMessage(datosEntrada: any): Promise<any> {
    try {
      const {
        tratamientos: tratamientosConsultados,
        medicos: medicosConsultados = [],
        fechas: fechasSeleccionadas,
        id_clinica,
        tiempo_actual,
      } = datosEntrada;
      // Validaciones básicas
      if (!id_clinica) throw AppError.FALTA_ID_CLINICA();
      if (!Array.isArray(tratamientosConsultados) || tratamientosConsultados.length === 0) throw AppError.NINGUN_TRATAMIENTO_SELECCIONADO();
      if (!Array.isArray(fechasSeleccionadas) || fechasSeleccionadas.length === 0) throw AppError.NINGUNA_FECHA_SELECCIONADA();
      Logger.info("Datos de entrada procesados correctamente.");
      // 1. Traer tratamientos base
      let datosTratamientos = await this.obtenerDatosTratamientos({ id_clinica, tratamientosConsultados });
      Logger.info("Tratamientos obtenidos:", JSON.stringify(datosTratamientos));
      // 2. Filtrar por médicos (opcional)
      let idsMedicosSolicitados: number[] = [];
      let tratamientosFiltrados = datosTratamientos;
      if (medicosConsultados.length > 0) {
        const filas = await this.medicoRepo.getIdsMedicosPorNombre(medicosConsultados, id_clinica);
        idsMedicosSolicitados = filas.map((f: any) => f.id_medico);
        if (idsMedicosSolicitados.length === 0) throw AppError.NINGUN_MEDICO_ENCONTRADO(medicosConsultados);
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
      // 3. Recolectar IDs médicos / espacios
      const idsMedicos = idsMedicosSolicitados.length
        ? idsMedicosSolicitados
        : [
          ...new Set(
            tratamientosFiltrados.flatMap((t: any) => t.medicos.map((m: any) => m.id_medico))
          ),
        ];
      const idsEspacios = [
        ...new Set(
          tratamientosFiltrados.flatMap((t: any) =>
            t.medicos.flatMap((m: any) => m.espacios.map((e: any) => e.id_espacio))
          )
        ),
      ];
      if (idsMedicos.length === 0) {
        const nombresTratamientos = tratamientosFiltrados.map((t: any) => t.tratamiento.nombre_tratamiento);
        if (medicosConsultados.length > 0) throw AppError.MEDICO_NO_ASOCIADO_A_TRATAMIENTO(medicosConsultados, tratamientosConsultados);
        else throw AppError.NINGUN_MEDICO_ENCONTRADO(nombresTratamientos);
      }
      if (idsEspacios.length === 0) {
        // Aquí puedes llamar a espacioRepo para los nombres si es necesario
        throw AppError.NINGUN_ESPACIO_ENCONTRADO(tratamientosFiltrados.map((t: any) => t.tratamiento.nombre_tratamiento), idsMedicos);
      }
      // 4. Generar consultas SQL
      const consultasSQL = generarConsultasSQL({
        fechas: fechasSeleccionadas,
        id_medicos: idsMedicos,
        id_espacios: idsEspacios,
        id_clinica,
      });
      // 5. Ejecutar consultas
      let citas, progMedicos, progEspacios, progMedicoEspacio;
      try {
        citas = await ejecutarConReintento(consultasSQL.sql_citas, []);
        progMedicos = await ejecutarConReintento(consultasSQL.sql_prog_medicos, []);
        progEspacios = await ejecutarConReintento(consultasSQL.sql_prog_espacios, []);
        progMedicoEspacio = await ejecutarConReintento(consultasSQL.sql_prog_medico_espacio, []);
      } catch (error) {
        Logger.error("Error en la ejecución de consultas SQL:", error);
        if (error instanceof AppError) throw error;
        const err = error instanceof Error ? error : new Error(String(error));
        throw AppError.ERROR_CONSULTA_SQL(err);
      }

      if (!progMedicos?.length) {
        throw AppError.NO_PROG_MEDICOS(idsMedicos, fechasSeleccionadas.map((f: any) => f.fecha));
      }
      if (!progEspacios?.length) {
        throw AppError.NO_PROG_ESPACIOS(idsEspacios, fechasSeleccionadas.map((f: any) => f.fecha));
      }
      // 6. Calcular disponibilidad
      let disponibilidad = calcularDisponibilidad({
        tratamientos: tratamientosFiltrados,
        citas_programadas: citas,
        prog_medicos: progMedicos,
        prog_espacios: progEspacios,
        prog_medico_espacio: progMedicoEspacio,
      });
      // 7. Ajuste final (tiempo_actual)
      const disponibilidadAjustada = ajustarDisponibilidad(disponibilidad, tiempo_actual);
      if (!disponibilidadAjustada.length) {
        throw AppError.SIN_HORARIOS_DISPONIBLES(tratamientosConsultados, fechasSeleccionadas);
      }
      Logger.info("Disponibilidad final ajustada:", disponibilidadAjustada);
      return {
        success: true,
        message: null,
        analisis_agenda: disponibilidadAjustada,
      };
    } catch (e: any) {
      Logger.error("Error en getAppointmentAvailabilityFromUserMessage:", e);
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
      Logger.error("Error no controlado:", e);
      const ed = AppError.ERROR_DESCONOCIDO(e);
      return {
        success: false,
        message: ed.message,
        analisis_agenda: [],
      };
    }
  }
}
