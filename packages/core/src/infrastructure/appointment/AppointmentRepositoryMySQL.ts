// @clinickeys-agents/core/src/infrastructure/appointment/AppointmentRepositoryMySQL.ts

import { ejecutarConReintento, ejecutarExecConReintento, ejecutarUnicoResultado } from "@clinickeys-agents/core/infrastructure/helpers";

export interface CreateAppointmentInput {
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
  comentarios_cita: string;
  [key: string]: any;
}

export interface UpdateAppointmentInput {
  id_cita: number;
  id_medico?: number;
  fecha_cita?: string;
  hora_inicio?: string;
  hora_fin?: string;
  id_espacio?: number;
  id_estado_cita?: number;
  id_estados_cita_in?: number | null;
  comentarios_cita: string;
  [key: string]: any;
}

export class AppointmentRepositoryMySQL {
  /**
   * Crea una nueva cita.
   */
  async createAppointment(params: CreateAppointmentInput): Promise<number> {
    const query = `
    INSERT INTO citas (
      id_paciente, id_clinica, id_super_clinica, id_medico,
      id_tratamiento, id_espacio, fecha_cita, hora_inicio, hora_fin,
      id_presupuesto, id_pack_bono, comentarios_cita
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
      params.comentarios_cita ?? null
    ];

    const result: any = await ejecutarExecConReintento(query, args);
    return result.insertId || result[0]?.insertId;
  }

  /**
   * Actualiza una cita existente.
   */
  async updateAppointment(params: UpdateAppointmentInput): Promise<void> {
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
    if (params.comentarios_cita !== undefined) {
      updates.push("comentarios_cita = ?");
      values.push(params.comentarios_cita);
    }
    if (params.id_estados_cita_in !== undefined) {
      updates.push("id_estados_cita_in = ?");
      values.push(params.id_estados_cita_in);
    }

    if (updates.length === 0) return;

    const query = `
      UPDATE citas
      SET ${updates.join(", ")}
      WHERE id_cita = ?
    `;
    values.push(params.id_cita);

    await ejecutarExecConReintento(query, values);
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
        CONCAT(TRIM(medicos.nombre_medico), ' ', TRIM(medicos.apellido_medico)) AS nombre_medico
      FROM citas
      LEFT JOIN espacios ON citas.id_espacio = espacios.id_espacio
      LEFT JOIN tratamientos ON citas.id_tratamiento = tratamientos.id_tratamiento
      LEFT JOIN medicos ON citas.id_medico = medicos.id_medico
      WHERE citas.id_paciente = ?
      AND citas.id_clinica = ?
      AND citas.id_estado_cita IN (1, 7, 8, 9)
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
    const row = await ejecutarUnicoResultado(query, [id_cita]);
    return row || undefined;
  }

  async getCitasDetallePorPackTratamiento(id_paciente: number, id_clinica: number): Promise<any | undefined> {
    const query = `
      SELECT id_pack_bono, id_tratamiento, id_cita
      FROM citas
      WHERE id_paciente = ? 
        AND id_pack_bono IS NOT NULL
        AND id_clinica = ?
    `;
    await ejecutarConReintento(query, [id_paciente, id_clinica]);
  }

  /**
     * Inserta una cita asociada a un pack bono, usando el stored procedure legacy.
     */
  async insertarCitaPackBonos(params: {
    p_id_paciente: number,
    p_id_medico: number,
    p_id_espacio: number,
    p_id_tratamiento: number,
    p_fecha_cita: string,
    p_hora_inicio: string,
    p_hora_fin: string,
    p_id_clinica: number,
    p_id_super_clinica: number,
    p_id_pack_bono: number,
    p_id_presupuesto: number,
    p_comentarios_cita: string,
  }): Promise<any> {
    const query = "CALL sp_crear_cita_con_comentario(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const values = [
      params.p_id_paciente,
      params.p_id_medico,
      params.p_id_espacio,
      params.p_id_tratamiento,
      params.p_fecha_cita,
      params.p_hora_inicio,
      params.p_hora_fin,
      params.p_id_clinica,
      params.p_id_super_clinica,
      params.p_id_pack_bono,
      params.p_id_presupuesto,
      params.p_comentarios_cita
    ];
    return await ejecutarExecConReintento(query, values);
  }
}
