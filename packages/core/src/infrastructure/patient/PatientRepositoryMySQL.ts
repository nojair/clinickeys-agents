// /src/infrastructure/patient/PatientRepositoryMySQL.ts

import { IPatientRepository } from "@clinickeys-agents/core/domain/patient/IPatientRepository";
import type { Pool } from "mysql2/promise";

/**
 * Implementación MySQL del repositorio de pacientes.
 */
export class PatientRepositoryMySQL implements IPatientRepository {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Actualiza el campo kommo_lead_id de un paciente específico.
   * @param patientId - ID del paciente
   * @param kommoLeadId - ID de lead Kommo asignado
   */
  async updateKommoLeadId(patientId: number, kommoLeadId: string): Promise<void> {
    await this.pool.execute(
      "UPDATE pacientes SET kommo_lead_id = ? WHERE id_paciente = ?",
      [kommoLeadId, patientId]
    );
  }

  /**
   * Obtiene el kommo_lead_id guardado en BD de un paciente específico.
   * @param patientId - ID del paciente
   * @returns Promise<string | undefined>
   */
  async getKommoLeadId(patientId: number): Promise<string | undefined> {
    const [rows] = await this.pool.query(
      "SELECT kommo_lead_id FROM pacientes WHERE id_paciente = ?",
      [patientId]
    );
    const row = (rows as { kommo_lead_id?: string }[])[0];
    return row?.kommo_lead_id;
  }
}
