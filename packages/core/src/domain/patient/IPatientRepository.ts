// @clinickeys-agents/core/src/domain/patient/IPatientRepository.ts

export interface IPatientRepository {
  /**
   * Actualiza el kommoLeadId de un paciente.
   */
  updateKommoLeadId(patientId: number, kommoLeadId: string): Promise<void>;

  /**
   * Obtiene el kommoLeadId de un paciente.
   */
  getKommoLeadId(patientId: number): Promise<string | undefined>;

  /**
   * Crea un paciente y retorna el id insertado.
   */
  createPatient(params: {
    nombre: string;
    apellido: string;
    telefono: string;
    id_clinica: number;
    id_super_clinica: number;
    kommo_lead_id?: string;
  }): Promise<number>;

  /**
   * Busca paciente por teléfono.
   */
  findByPhone(telefono: string): Promise<any | undefined>;

  /**
   * Busca paciente por ID.
   */
  findById(patientId: number): Promise<any | undefined>;

  /**
   * Busca paciente por número nacional, clínica y solo activos.
   */
  findByNationalPhoneAndClinic(
    telefonoNacional: string,
    id_clinica: number
  ): Promise<any | undefined>;
}
