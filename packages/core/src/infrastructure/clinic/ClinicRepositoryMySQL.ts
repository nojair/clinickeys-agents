// packages/core/src/infrastructure/clinic/ClinicRepositoryMySQL.ts
import { IClinicRepository, ClinicRepositoryError, ClinicNotFoundError, ClinicDTO } from "@clinickeys-agents/core/domain/clinic";
import { ejecutarConReintento } from "@clinickeys-agents/core/infrastructure/helpers";

/**
 * Repositorio MySQL para clínicas.
 * Atiende exclusivamente al `clinicSource = "legacy"`.
 */
export class ClinicRepositoryMySQL implements IClinicRepository {

  // ---------------------------------------------------------------- findById
  async findById(clinicSource: string, clinicId: string): Promise<ClinicDTO | null> {
    try {
      const query = `
        SELECT
          id_clinica        AS clinicId,
          id_super_clinica  AS superClinicId,
          nombre_clinica    AS name,
          cif,
          direccion         AS address,
          telefono          AS phone,
          ciudad            AS city,
          pais              AS country,
          email,
          codigo_postal     AS postalCode,
          url_logo          AS logoUrl,
          url_firma         AS signatureUrl,
          rep_legal         AS legalRep,
          nif_rep_legal     AS legalRepNif
        FROM clinicas
        WHERE clinicId = ?
        LIMIT 1
      `;
      const args = [clinicId];

      const [rows] = await ejecutarConReintento(query, args)

      if (rows.length === 0) throw new ClinicNotFoundError(clinicId);

      return { clinicSource, ...rows[0] } as ClinicDTO;
    } catch (error: any) {
      if (error instanceof ClinicNotFoundError) throw error;
      throw new ClinicRepositoryError(error.message);
    }
  }

  // ---------------------------------------------------------------- findAll
  async findAll(clinicSource?: string): Promise<ClinicDTO[]> {
    // Si se solicita otra fuente, este repo devuelve []

    try {
      const query = `
        SELECT 
          id_clinica        AS clinicId,
          id_super_clinica  AS superClinicId,
          nombre_clinica    AS name,
          cif,
          direccion         AS address,
          telefono          AS phone,
          ciudad            AS city,
          pais              AS country,
          email,
          codigo_postal     AS postalCode,
          url_logo          AS logoUrl,
          url_firma         AS signatureUrl,
          rep_legal         AS legalRep,
          nif_rep_legal     AS legalRepNif
        FROM clinicas
      `;
      const [rows] = await ejecutarConReintento(query);

      return rows.map((row: any) => ({ clinicSource, ...row })) as ClinicDTO[];
    } catch (error: any) {
      throw new ClinicRepositoryError(error.message);
    }
  }
}
