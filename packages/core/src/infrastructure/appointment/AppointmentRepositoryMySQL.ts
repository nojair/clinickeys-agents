// @clinickeys-agents/core/src/infrastructure/appointment/AppointmentRepositoryMySQL.ts

import { ejecutarConReintento } from "@clinickeys-agents/core/utils";

export interface AppointmentCreateParams {
  id_paciente: number;
  id_clinica: number;
  id_super_clinica: number;
  id_medico: number;
  id_tratamiento: number;
  id_espacio: number;
  fecha_cita: string;
  hora_inicio: string;
  hora_fin: string;
  id_presupuesto?: number | null;
  id_pack_bono?: number | null;
  notas?: string;
  [key: string]: any;
}

export interface AppointmentUpdateParams {
  id_cita: number;
  id_medico?: number;
  fecha_cita?: string;
  hora_inicio?: string;
  hora_fin?: string;
  id_espacio?: number;
  id_estado_cita?: number;
  notas?: string;
  [key: string]: any;
}

export class AppointmentRepositoryMySQL {
  /**
   * Crea una nueva cita.
   */
  async createAppointment(params: AppointmentCreateParams): Promise<number> {
    const query = `
      INSERT INTO citas (
        id_paciente, id_clinica, id_super_clinica, id_medico,
        id_tratamiento, id_espacio, fecha_cita, hora_inicio, hora_fin,
        id_presupuesto, id_pack_bono, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const args = [
      params.id_paciente,
      params.id_clinica,
      params.id_super_clinica,
      params.id_medico,
      params.id_tratamiento,
      params.id_espacio,
      params.fecha_cita,
      params.hora_inicio,
      params.hora_fin,
      params.id_presupuesto ?? null,
      params.id_pack_bono ?? null,
      params.notas ?? null
    ];
    const result: any = await ejecutarConReintento(query, args);
    return result.insertId || result[0]?.insertId;
  }

  /**
   * Actualiza una cita existente.
   */
  async updateAppointment(params: AppointmentUpdateParams): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    if (params.id_medico !== undefined) {
      updates.push("id_medico = ?");
      values.push(params.id_medico);
    }
    if (params.fecha_cita !== undefined) {
      updates.push("fecha_cita = ?");
      values.push(params.fecha_cita);
    }
    if (params.hora_inicio !== undefined) {
      updates.push("hora_inicio = ?");
      values.push(params.hora_inicio);
    }
    if (params.hora_fin !== undefined) {
      updates.push("hora_fin = ?");
      values.push(params.hora_fin);
    }
    if (params.id_espacio !== undefined) {
      updates.push("id_espacio = ?");
      values.push(params.id_espacio);
    }
    if (params.id_estado_cita !== undefined) {
      updates.push("id_estado_cita = ?");
      values.push(params.id_estado_cita);
    }
    if (params.notas !== undefined) {
      updates.push("notas = ?");
      values.push(params.notas);
    }

    if (updates.length === 0) return;

    const query = `
      UPDATE citas
      SET ${updates.join(", ")}
      WHERE id_cita = ?
    `;
    values.push(params.id_cita);
    await ejecutarConReintento(query, values);
  }

  /**
   * Obtiene las citas de un paciente por clínica.
   */
  async getAppointmentsByPatient(patientId: number, clinicId: number): Promise<any[]> {
    const query = `
      SELECT 
        citas.*, 
        espacios.nombre AS nombre_espacio,
        tratamientos.nombre_tratamiento,
        medicos.nombre_medico,
        medicos.apellido_medico
      FROM citas
      LEFT JOIN espacios ON citas.id_espacio = espacios.id_espacio
      LEFT JOIN tratamientos ON citas.id_tratamiento = tratamientos.id_tratamiento
      LEFT JOIN medicos ON citas.id_medico = medicos.id_medico
      WHERE citas.id_paciente = ? AND citas.id_clinica = ?
      ORDER BY citas.fecha_cita ASC, citas.hora_inicio ASC
    `;
    return await ejecutarConReintento(query, [patientId, clinicId]);
  }

  /**
   * Obtiene una cita por su ID.
   */
  async findById(id_cita: number): Promise<any | undefined> {
    const query = `
      SELECT * FROM citas WHERE id_cita = ?
    `;
    const rows = await ejecutarConReintento(query, [id_cita]);
    return rows[0] || undefined;
  }

  /**
   * Elimina una cita por su ID.
   */
  async deleteAppointment(id_cita: number): Promise<void> {
    const query = `DELETE FROM citas WHERE id_cita = ?`;
    await ejecutarConReintento(query, [id_cita]);
  }
}
