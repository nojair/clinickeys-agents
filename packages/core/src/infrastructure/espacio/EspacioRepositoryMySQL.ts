// @clinickeys-agents/core/src/infrastructure/espacio/EspacioRepositoryMySQL.ts

import { ejecutarConReintento } from "@clinickeys-agents/core/utils";

export interface EspacioDTO {
  id_espacio: number;
  id_clinica: number;
  nombre: string;
  // puedes agregar más campos según tus necesidades
}

export class EspacioRepositoryMySQL {
  /**
   * Obtiene un espacio por su ID.
   */
  async findById(id_espacio: number): Promise<EspacioDTO | undefined> {
    const query = `
      SELECT id_espacio, id_clinica, nombre
      FROM espacios
      WHERE id_espacio = ?
      LIMIT 1
    `;
    const rows = await ejecutarConReintento(query, [id_espacio]);
    return rows[0] || undefined;
  }

  /**
   * Obtiene todos los espacios de una clínica.
   */
  async findByClinica(id_clinica: number): Promise<EspacioDTO[]> {
    const query = `
      SELECT id_espacio, id_clinica, nombre
      FROM espacios
      WHERE id_clinica = ?
    `;
    return await ejecutarConReintento(query, [id_clinica]);
  }

  /**
   * Obtiene todos los espacios donde un médico puede realizar un tratamiento específico en una clínica.
   * Se asume la relación: medico_espacio y espacios_tratamientos.
   */
  async getEspaciosByMedicoAndTratamiento(
    id_medico: number,
    id_tratamiento: number,
    id_clinica: number
  ): Promise<EspacioDTO[]> {
    const query = `
      SELECT e.id_espacio, e.id_clinica, e.nombre
      FROM espacios e
      INNER JOIN medico_espacio me ON me.id_espacio = e.id_espacio
      INNER JOIN espacios_tratamientos et ON et.id_espacio = e.id_espacio
      WHERE me.id_medico = ?
        AND et.id_tratamiento = ?
        AND e.id_clinica = ?
    `;
    return await ejecutarConReintento(query, [id_medico, id_tratamiento, id_clinica]);
  }
}
