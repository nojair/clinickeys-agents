export interface MedicoDTO {
  id_medico: number;
  nombre_medico: string;
  apellido_medico: string;
  colegiatura?: string;
  email?: string;
  telefono?: string;
  especialidad?: string;
  id_estado_registro?: number;
  id_clinica?: number;
  id_super_clinica?: number;
}

export interface IMedicoRepository {
  /**
   * Obtiene todos los médicos activos de una clínica y super clínica.
   */
  getMedicos(id_clinica: number, id_super_clinica: number): Promise<MedicoDTO[]>;

  /**
   * Obtiene un médico por su ID.
   */
  getMedicoById(id_medico: number): Promise<MedicoDTO | undefined>;

  /**
   * Busca médicos por especialidad (opcional).
   */
  findMedicosByEspecialidad(especialidad: string, id_clinica: number, id_super_clinica: number): Promise<MedicoDTO[]>;

  /**
   * Obtiene los médicos activos asociados a un tratamiento específico.
   */
  getMedicosByTratamiento(id_tratamiento: number, id_clinica: number): Promise<MedicoDTO[]>;

  /**
   * Obtiene IDs de médicos en una clínica por una lista de nombres completos normalizados.
   * @param nombresSolicitados - Array de nombres completos normalizados.
   * @param id_clinica - ID de la clínica.
   * @returns Array de objetos { id_medico, nombre_completo }
   */
  getIdsMedicosPorNombre(
    nombresSolicitados: string[],
    id_clinica: number
  ): Promise<{ id_medico: number; nombre_completo: string }[]>;
}
