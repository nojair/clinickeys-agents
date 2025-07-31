// @clinickeys-agents/core/src/infrastructure/medico/MedicoRepositoryMySQL.ts

import { ejecutarConReintento } from "@clinickeys-agents/core/infrastructure/helpers";
import { MedicoDTO, IMedicoRepository } from "@clinickeys-agents/core/domain/medico";

export class MedicoRepositoryMySQL implements IMedicoRepository {
  /**
   * Obtiene todos los médicos activos de una clínica y super clínica.
   */
  async getMedicos(id_clinica: number, id_super_clinica: number): Promise<MedicoDTO[]> {
    const query = `
      SELECT 
        m.id_medico,
        m.nombre_medico,
        m.apellido_medico,
        m.colegiatura,
        m.email,
        m.telefono,
        m.especialidad,
        m.id_estado_registro
      FROM medicos m
      WHERE m.id_clinica = ? 
        AND m.id_super_clinica = ?
        AND m.id_estado_registro = 1
      ORDER BY m.nombre_medico ASC, m.apellido_medico ASC
    `;
    return await ejecutarConReintento(query, [id_clinica, id_super_clinica]);
  }

  /**
   * Obtiene un médico por su ID.
   */
  async getMedicoById(id_medico: number): Promise<MedicoDTO | undefined> {
    const query = `
      SELECT 
        m.id_medico,
        m.nombre_medico,
        m.apellido_medico,
        m.colegiatura,
        m.email,
        m.telefono,
        m.especialidad,
        m.id_estado_registro,
        m.id_clinica,
        m.id_super_clinica
      FROM medicos m
      WHERE m.id_medico = ?
      LIMIT 1
    `;
    const rows = await ejecutarConReintento(query, [id_medico]);
    return rows[0] || undefined;
  }

  /**
   * Busca médicos por especialidad (opcional).
   */
  async findMedicosByEspecialidad(especialidad: string, id_clinica: number, id_super_clinica: number): Promise<MedicoDTO[]> {
    const query = `
      SELECT 
        m.id_medico,
        m.nombre_medico,
        m.apellido_medico,
        m.colegiatura,
        m.email,
        m.telefono,
        m.especialidad,
        m.id_estado_registro
      FROM medicos m
      WHERE m.id_clinica = ? 
        AND m.id_super_clinica = ?
        AND m.id_estado_registro = 1
        AND m.especialidad = ?
      ORDER BY m.nombre_medico ASC, m.apellido_medico ASC
    `;
    return await ejecutarConReintento(query, [id_clinica, id_super_clinica, especialidad]);
  }

  /**
   * Obtiene los médicos activos asociados a un tratamiento específico.
   */
  async getMedicosByTratamiento(id_tratamiento: number, id_clinica: number): Promise<MedicoDTO[]> {
    const query = `
      SELECT 
        m.id_medico,
        m.nombre_medico,
        m.apellido_medico,
        m.colegiatura,
        m.email,
        m.telefono,
        m.especialidad
      FROM medicos m
      INNER JOIN medico_tratamiento mt ON mt.id_medico = m.id_medico
      WHERE mt.id_tratamiento = ?
        AND m.id_clinica = ?
        AND m.id_estado_registro = 1
    `;
    return await ejecutarConReintento(query, [id_tratamiento, id_clinica]);
  }

  /**
   * Obtiene IDs de médicos en una clínica por una lista de nombres completos normalizados.
   * @param nombresSolicitados - Array de nombres completos normalizados.
   * @param id_clinica - ID de la clínica.
   * @returns Array de objetos { id_medico, nombre_completo }
   */
  async getIdsMedicosPorNombre(nombresSolicitados: string[], id_clinica: number): Promise<{ id_medico: number; nombre_completo: string }[]> {
    if (!Array.isArray(nombresSolicitados) || nombresSolicitados.length === 0) return [];

    const nombresNormalizados = nombresSolicitados.map((str) =>
      str.toLowerCase().trim().replace(/\s+/g, ' ')
    );
    const marcadores = nombresSolicitados.map(() => "?").join(", ");
    const sql = `
      SELECT
        id_medico,
        CONCAT(nombre_medico, ' ', apellido_medico) AS nombre_completo
      FROM medicos
      WHERE id_clinica = ?
        AND LOWER(TRIM(CONCAT(nombre_medico, ' ', apellido_medico))) IN (${marcadores})
    `;
    const params = [id_clinica, ...nombresNormalizados];
    const rows = await ejecutarConReintento(sql, params);
    return rows;
  }
}
