// /src/domain/patient/IPatientRepository.ts

/**
 * Contrato de repositorio para operaciones sobre la tabla pacientes.
 * Solo define los métodos mínimos requeridos por la lógica de negocio.
 */
export interface IPatientRepository {
  /**
   * Actualiza el campo kommo_lead_id de un paciente específico.
   * 
   * @param patientId - ID único del paciente (number).
   * @param kommoLeadId - ID de lead Kommo asignado (string).
   * @returns Promise<void>
   */
  updateKommoLeadId(patientId: number, kommoLeadId: string): Promise<void>;
}
