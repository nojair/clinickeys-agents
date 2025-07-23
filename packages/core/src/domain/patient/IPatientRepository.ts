// packages/core/src/domain/patient/IPatientRepository.ts

/**
 * Contrato de repositorio para operaciones sobre la tabla pacientes.
 * Define los métodos mínimos requeridos por la lógica de negocio.
 */
export interface IPatientRepository {
  /**
   * Actualiza el campo kommoLeadId de un paciente específico.
   *
   * @param patientId - ID único del paciente (number).
   * @param kommoLeadId - ID de lead Kommo asignado (string).
   * @returns Promise<void>
   */
  updateKommoLeadId(patientId: number, kommoLeadId: string): Promise<void>;

  /**
   * Obtiene el kommoLeadId guardado en BD de un paciente específico.
   *
   * @param patientId - ID único del paciente (number).
   * @returns Promise<string | undefined> - ID si existe, undefined si no.
   */
  getKommoLeadId(patientId: number): Promise<string | undefined>;
}
