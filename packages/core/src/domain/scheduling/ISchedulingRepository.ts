// @clinickeys-agents/core/src/domain/scheduling/ISchedulingRepository.ts

export interface ISchedulingRepository {
  /**
   * Actualiza una cita existente.
   */
  updateCita(
    id_cita: number,
    params: {
      id_medico: number;
      fecha_cita: string;
      hora_inicio: string;
      hora_fin: string;
      id_espacio: number;
      id_estado_cita?: number;
    }
  ): Promise<any>;

  /**
   * Inserta una cita con pack bonos.
   */
  insertarCitaPackBonos(params: {
    p_id_clinica: number;
    p_id_super_clinica: number;
    p_id_paciente: number;
    p_id_medico: number;
    p_id_espacio: number;
    p_id_tratamiento: number;
    p_id_presupuesto: number;
    p_id_pack_bono: number;
    p_fecha_cita: string;
    p_hora_inicio: string;
    p_hora_fin: string;
  }): Promise<any>;

  /**
   * Procesa pack bono y presupuesto de una cita.
   */
  procesarPackbonoPresupuestoDeCita(
    p_action: string,
    p_id_cita: number
  ): Promise<any>;

  /**
   * Obtiene tratamientos disponibles en una clínica.
   */
  getTratamientos(
    id_clinica: number,
    id_super_clinica: number
  ): Promise<any[]>;

  /**
   * Obtiene médicos activos de una clínica.
   */
  getMedicos(
    id_clinica: number,
    id_super_clinica: number
  ): Promise<any[]>;

  /**
   * Obtiene tratamientos y médicos relacionados.
   */
  obtenerDatosTratamientos(params: {
    id_clinica: number;
    tratamientosConsultados: string[];
  }): Promise<any>;

  /**
   * Obtiene citas activas/futuras para un paciente.
   */
  getCitasByPacienteId(
    id_paciente: number,
    id_clinica: number
  ): Promise<any[]>;

  /**
   * Obtiene presupuestos de un paciente.
   */
  getPresupuestosByPacienteId(
    id_paciente: number,
    id_clinica: number
  ): Promise<any[]>;

  /**
   * Obtiene sesiones de packs/bonos de un paciente.
   */
  getPackBonosSesionesByPacienteId(
    id_paciente: number
  ): Promise<any[]>;

  /**
   * Obtiene detalle de citas por pack y tratamiento para un paciente.
   */
  getCitasDetallePorPackTratamiento(id_paciente: number, id_clinica: number): Promise<any[]>;

  getPackBonoById(id_pack_bono: number, id_clinica: number): Promise<any | undefined>;

  getPackBonoTratamientos(id_pack_bono: number): Promise<any[]>
}
