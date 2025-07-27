// @clinickeys-agents/core/src/infrastructure/packBono/PackBonoRepositoryMySQL.ts

import { ejecutarConReintento } from "@clinickeys-agents/core/utils";

export class PackBonoRepositoryMySQL {
  /**
   * Obtiene todos los packs bono de una clínica.
   */
  async getPackBonosByClinic(id_clinica: number): Promise<any[]> {
    const query = `
      SELECT id_pack_bono, id_clinica, id_super_clinica, nombre, descripcion, precio
      FROM pack_bonos
      WHERE id_clinica = ?
    `;
    return await ejecutarConReintento(query, [id_clinica]);
  }

  /**
   * Obtiene un pack bono por su ID y clínica.
   */
  async getPackBonoById(id_pack_bono: number, id_clinica: number): Promise<any | undefined> {
    const query = `
      SELECT id_pack_bono, id_clinica, id_super_clinica, nombre, descripcion, precio
      FROM pack_bonos
      WHERE id_pack_bono = ? AND id_clinica = ?
      LIMIT 1
    `;
    const rows = await ejecutarConReintento(query, [id_pack_bono, id_clinica]);
    return rows[0] || undefined;
  }

  /**
   * Obtiene todos los tratamientos asociados a un pack bono.
   */
  async getPackBonoTratamientos(id_pack_bono: number): Promise<any[]> {
    const query = `
      SELECT id_pack_bono_tratamientos, id_pack_bono, id_par_tratamiento, id_tratamiento, total_sesiones
      FROM pack_bono_tratamientos
      WHERE id_pack_bono = ?
    `;
    return await ejecutarConReintento(query, [id_pack_bono]);
  }

  /**
   * Obtiene las sesiones de pack bono de un paciente.
   */
  async getPackBonosSesionesByPacienteId(id_paciente: number): Promise<any[]> {
    const query = `
      SELECT *
      FROM pack_bonos_sesiones
      WHERE id_paciente = ?
    `;
    return await ejecutarConReintento(query, [id_paciente]);
  }

  /**
   * Inserta una sesión de pack bono para un paciente.
   */
  async insertPackBonoSesion(params: {
    id_paciente: number;
    id_pack_bono: number;
    fecha_inicio: string;
    fecha_fin: string;
    total_sesiones: number;
    sesiones_utilizadas: number;
  }): Promise<void> {
    const query = `
      INSERT INTO pack_bonos_sesiones (
        id_paciente, id_pack_bono, fecha_inicio, fecha_fin, total_sesiones, sesiones_utilizadas
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    await ejecutarConReintento(query, [
      params.id_paciente,
      params.id_pack_bono,
      params.fecha_inicio,
      params.fecha_fin,
      params.total_sesiones,
      params.sesiones_utilizadas,
    ]);
  }
}
