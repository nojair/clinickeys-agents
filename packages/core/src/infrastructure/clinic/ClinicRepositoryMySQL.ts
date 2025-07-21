// packages/core/src/infrastructure/clinic/ClinicRepositoryMySQL.ts

import { Pool, RowDataPacket } from "mysql2/promise";
import { ClinicDTO } from "../../domain/clinic/dtos";
import { IClinicRepository } from "../../domain/clinic/IClinicRepository";
import { ClinicRepositoryError, ClinicNotFoundError } from "../../domain/clinic/errors";

/**
 * Repositorio MySQL para clínicas.
 * Atiende exclusivamente al `clinic_source = "legacy"`.
 */
export class ClinicRepositoryMySQL implements IClinicRepository {
  private readonly pool: Pool;
  private static readonly SOURCE = "legacy";

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ---------------------------------------------------------------- findById
  async findById(clinicSource: string, clinicId: string): Promise<ClinicDTO | null> {
    if (clinicSource !== ClinicRepositoryMySQL.SOURCE) {
      return null; // este repositorio no gestiona la fuente solicitada
    }
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        `SELECT 
          id_clinica        AS id,
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
        WHERE id_clinica = ?
        LIMIT 1`,
        [clinicId]
      );

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
    if (clinicSource && clinicSource !== ClinicRepositoryMySQL.SOURCE) return [];

    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        `SELECT 
          id_clinica        AS id,
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
        FROM clinicas`
      );

      return rows.map(row => ({ clinicSource: ClinicRepositoryMySQL.SOURCE, ...row })) as ClinicDTO[];
    } catch (error: any) {
      throw new ClinicRepositoryError(error.message);
    }
  }
}
