// @clinickeys-agents/core/src/infrastructure/tratamiento/TratamientoRepositoryMySQL.ts

import { ejecutarConReintento } from "@clinickeys-agents/core/utils";

export class TratamientoRepositoryMySQL {
  /**
   * Obtiene todos los tratamientos activos de una clínica y super clínica.
   */
  async getTratamientos(id_clinica: number, id_super_clinica: number): Promise<any[]> {
    const query = `
      SELECT 
        t.id_tratamiento,
        t.nombre_tratamiento,
        t.descripcion,
        t.duracion,
        t.precio,
        t.id_estado_registro,
        t.id_clinica,
        t.id_super_clinica
      FROM tratamientos t
      WHERE t.id_clinica = ? 
        AND t.id_super_clinica = ?
        AND t.id_estado_registro = 1
      ORDER BY t.nombre_tratamiento ASC
    `;
    return await ejecutarConReintento(query, [id_clinica, id_super_clinica]);
  }

  /**
   * Obtiene un tratamiento por su ID.
   */
  async getTratamientoById(id_tratamiento: number): Promise<any | undefined> {
    const query = `
      SELECT 
        t.id_tratamiento,
        t.nombre_tratamiento,
        t.descripcion,
        t.duracion,
        t.precio,
        t.id_estado_registro,
        t.id_clinica,
        t.id_super_clinica
      FROM tratamientos t
      WHERE t.id_tratamiento = ?
      LIMIT 1
    `;
    const rows = await ejecutarConReintento(query, [id_tratamiento]);
    return rows[0] || undefined;
  }

  /**
   * Busca tratamientos por nombre (búsqueda LIKE %...%).
   */
  async findTratamientosByNombre(nombre: string, id_clinica: number, id_super_clinica: number): Promise<any[]> {
    const query = `
      SELECT 
        t.id_tratamiento,
        t.nombre_tratamiento,
        t.descripcion,
        t.duracion,
        t.precio,
        t.id_estado_registro,
        t.id_clinica,
        t.id_super_clinica
      FROM tratamientos t
      WHERE t.id_clinica = ? 
        AND t.id_super_clinica = ?
        AND t.id_estado_registro = 1
        AND t.nombre_tratamiento LIKE ?
      ORDER BY t.nombre_tratamiento ASC
    `;
    return await ejecutarConReintento(query, [id_clinica, id_super_clinica, `%${nombre}%`]);
  }
}
