// @clinickeys-agents/core/src/infrastructure/patient/PatientRepositoryMySQL.ts

import { IPatientRepository } from "@clinickeys-agents/core/domain/patient/IPatientRepository";
import { ejecutarConReintento, ejecutarUnicoResultado } from "@clinickeys-agents/core/utils";

/**
 * Implementación MySQL del repositorio de pacientes.
 */
export class PatientRepositoryMySQL implements IPatientRepository {
  /**
   * Actualiza el campo kommoLeadId de un paciente específico.
   */
  async updateKommoLeadId(patientId: number, kommoLeadId: string): Promise<void> {
    await ejecutarConReintento(
      "UPDATE pacientes SET kommo_lead_id = ? WHERE id_paciente = ?",
      [kommoLeadId, patientId]
    );
  }

  /**
   * Obtiene el kommoLeadId guardado en BD de un paciente específico.
   */
  async getKommoLeadId(patientId: number): Promise<string | undefined> {
    const row = await ejecutarUnicoResultado(
      "SELECT kommo_lead_id AS kommoLeadId FROM pacientes WHERE id_paciente = ?",
      [patientId]
    );
    return row?.kommoLeadId;
  }

  /**
   * Crea un nuevo paciente y retorna el id insertado.
   */
  async createPatient(params: {
    nombre: string;
    apellido: string;
    telefono: string;
    id_clinica: number;
    id_super_clinica: number;
    kommo_lead_id?: string;
  }): Promise<number> {
    const query = `
      INSERT INTO pacientes 
        (nombre, apellido, telefono, id_clinica, codigo_postal, nif_cif, id_super_clinica, id_estado_registro, lopd_aceptado, kommo_lead_id, old_id, usuario_creacion)
      VALUES (?, ?, ?, ?, 0, 0, ?, 1, 1, ?, 0, ?)
    `;
    const paramsArr = [
      params.nombre,
      params.apellido,
      params.telefono,
      params.id_clinica,
      params.id_super_clinica,
      params.kommo_lead_id || null,
      "CHATBOT"
    ];
    const result: any = await ejecutarConReintento(query, paramsArr);
    return result.insertId || result[0]?.insertId;
  }

  /**
   * Busca paciente por teléfono. Devuelve el primer match o undefined.
   */
  async findByPhone(telefono: string): Promise<any | undefined> {
    const row = await ejecutarUnicoResultado(
      "SELECT * FROM pacientes WHERE telefono = ? LIMIT 1",
      [telefono]
    );
    return row || undefined;
  }

  /**
   * Busca paciente por ID. Devuelve el registro completo o undefined.
   */
  async findById(patientId: number): Promise<any | undefined> {
    const row = await ejecutarUnicoResultado(
      "SELECT * FROM pacientes WHERE id_paciente = ?",
      [patientId]
    );
    return row || undefined;
  }

  /**
   * Busca paciente por teléfono nacional (solo dígitos), clínica y estado activo.
   */
  async findByNationalPhoneAndClinic(telefonoNacional: string, id_clinica: number): Promise<any | undefined> {
    const row = await ejecutarUnicoResultado(
      `SELECT id_paciente, nombre, apellido, telefono, id_clinica, nif_cif, id_super_clinica, id_cliente, kommo_lead_id
       FROM pacientes
       WHERE REGEXP_REPLACE(telefono, '[^0-9]', '') LIKE CONCAT('%', ?, '%')
         AND id_clinica = ?
         AND id_estado_registro = 1
       LIMIT 1`,
      [telefonoNacional, id_clinica]
    );
    return row || undefined;
  }
}
