import { ITratamientoRepository } from "@clinickeys-agents/core/domain/tratamiento";
import { ejecutarConReintento } from "@clinickeys-agents/core/infrastructure/helpers";

export class TratamientoRepositoryMySQL implements ITratamientoRepository {
  /**
   * Returns all active treatments for a clinic and super clinic.
   */
  async getActiveTreatmentsForClinic(clinicId: number, superClinicId: number): Promise<any[]> {
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
    return await ejecutarConReintento(query, [clinicId, superClinicId]);
  }

  /**
   * Returns treatment details by treatment ID.
   */
  async getTreatmentDetailsById(treatmentId: number): Promise<any | undefined> {
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
    const rows = await ejecutarConReintento(query, [treatmentId]);
    return rows[0] || undefined;
  }

  /**
   * Finds treatments that contain the provided name (LIKE %...%).
   */
  async findTreatmentsContainingName(name: string, clinicId: number, superClinicId: number): Promise<any[]> {
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
    return await ejecutarConReintento(query, [clinicId, superClinicId, `%${name}%`]);
  }

  /**
   * Finds treatments by array of names, with relevance and exact match info.
   */
  async findTreatmentsByNamesWithRelevance(names: string[], clinicId: number): Promise<any[]> {
    const searchTerms = names.join(" ");
    const exactMarkers = names.map(() => "LOWER(TRIM(?))").join(", ");
    const query = `
      SELECT DISTINCT
        t.id_tratamiento,
        t.nombre_tratamiento,
        t.descripcion,
        t.duracion,
        t.precio,
        t.id_estado_registro,
        t.id_clinica,
        t.id_super_clinica,
        MATCH(t.nombre_tratamiento, t.descripcion) AGAINST(?) AS relevance,
        (CASE
          WHEN LOWER(TRIM(t.nombre_tratamiento)) IN (${exactMarkers}) THEN 1
          ELSE 0
        END) AS is_exact
      FROM tratamientos t
      WHERE t.id_clinica = ?
        AND t.id_estado_registro = 1
        AND MATCH(t.nombre_tratamiento, t.descripcion) AGAINST(?)
      ORDER BY is_exact DESC, relevance DESC, t.nombre_tratamiento ASC
    `;
    const params = [
      searchTerms,
      ...names.map(n => n.toLowerCase().trim()),
      clinicId,
      searchTerms
    ];
    return await ejecutarConReintento(query, params);
  }
}
