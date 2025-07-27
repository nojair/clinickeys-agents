// @clinickeys-agents/core/src/infrastructure/scheduling/SchedulingRepositoryMySQL.ts

import { ISchedulingRepository } from "@clinickeys-agents/core/domain/scheduling/ISchedulingRepository";
import { ejecutarConReintento } from "@clinickeys-agents/core/utils";

/**
 * Implementación MySQL del repositorio de scheduling (agenda, citas, tratamientos, médicos, espacios).
 */
export class SchedulingRepositoryMySQL implements ISchedulingRepository {
  async updateCita(
    id_cita: number,
    {
      id_medico,
      fecha_cita,
      hora_inicio,
      hora_fin,
      id_espacio,
      id_estado_cita = 7
    }: {
      id_medico: number;
      fecha_cita: string;
      hora_inicio: string;
      hora_fin: string;
      id_espacio: number;
      id_estado_cita?: number;
    }
  ): Promise<any> {
    let fechaCitaFormatted = fecha_cita;
    if (!fecha_cita.includes("T")) {
      fechaCitaFormatted = fecha_cita + "T00:00:00.000Z";
    }
    const query = `
      UPDATE citas 
      SET id_medico = ?, fecha_cita = ?, hora_inicio = ?, hora_fin = ?, id_espacio = ?, id_estado_cita = ? 
      WHERE id_cita = ?;
    `;
    const params = [id_medico, fechaCitaFormatted, hora_inicio, hora_fin, id_espacio, id_estado_cita, id_cita];
    return await ejecutarConReintento(query, params);
  }

  async insertarCitaPackBonos({
    p_id_clinica,
    p_id_super_clinica,
    p_id_paciente,
    p_id_medico,
    p_id_espacio,
    p_id_tratamiento,
    p_id_presupuesto,
    p_id_pack_bono,
    p_fecha_cita,
    p_hora_inicio,
    p_hora_fin
  }: {
    p_id_clinica: number;
    p_id_super_clinica: number;
    p_id_paciente: number;
    p_id_medico: number;
    p_id_espacio: number;
    p_id_tratamiento: number;
    p_id_presupuesto: number;
    p_id_pack_bono: number;
    p_fecha_cita: string;
    p_hora_inicio: string;
    p_hora_fin: string;
  }): Promise<any> {
    const query = "CALL sp_insertar_cita_pack_bonos(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const params = [
      p_id_clinica,
      p_id_super_clinica,
      p_id_paciente,
      p_id_medico,
      p_id_espacio,
      p_id_tratamiento,
      p_id_presupuesto,
      p_id_pack_bono,
      p_fecha_cita,
      p_hora_inicio,
      p_hora_fin
    ];
    return await ejecutarConReintento(query, params);
  }

  async procesarPackbonoPresupuestoDeCita(p_action: string, p_id_cita: number): Promise<any> {
    const query = 'CALL sp_procesar_cita_packbono_y_presupuesto(?, ?)';
    const params = [p_action, p_id_cita];
    return await ejecutarConReintento(query, params);
  }

  async getTratamientos(id_clinica: number, id_super_clinica: number): Promise<any[]> {
    const query = `
      SELECT id_tratamiento, nombre_tratamiento 
      FROM tratamientos 
      WHERE id_clinica = ? AND id_super_clinica = ?
    `;
    return await ejecutarConReintento(query, [id_clinica, id_super_clinica]);
  }

  async getMedicos(id_clinica: number, id_super_clinica: number): Promise<any[]> {
    const query = `
      SELECT 
        m.id_medico,
        CONCAT(TRIM(m.nombre_medico), ' ', TRIM(m.apellido_medico)) AS nombre_medico
      FROM medicos m
      WHERE m.id_clinica = ? 
        AND m.id_super_clinica = ? 
        AND m.id_estado_registro = 1
      ORDER BY nombre_medico ASC
    `;
    return await ejecutarConReintento(query, [id_clinica, id_super_clinica]);
  }

  async obtenerDatosTratamientos({
    id_clinica,
    tratamientosConsultados
  }: {
    id_clinica: number;
    tratamientosConsultados: string[];
  }): Promise<any> {
    const matchAgainst = tratamientosConsultados.join(" ");
    const marcadoresExactos = tratamientosConsultados.map(() => "LOWER(TRIM(?))").join(", ");
    const consultaSQL = `
      SELECT DISTINCT
          id_tratamiento,
          nombre_tratamiento,
          duracion AS duracion_tratamiento,
          MATCH(nombre_tratamiento, descripcion) AGAINST(?) AS relevancia,
          (CASE
              WHEN LOWER(TRIM(nombre_tratamiento)) IN (${marcadoresExactos}) THEN 1
              ELSE 0
           END) AS es_exacto
      FROM tratamientos
      WHERE MATCH(nombre_tratamiento, descripcion) AGAINST(?)
        AND id_clinica = ?
      ORDER BY es_exacto DESC, relevancia DESC, nombre_tratamiento ASC
    `;
    const parametros = [
      matchAgainst,
      ...tratamientosConsultados.map((tc) => tc.toLowerCase().trim()),
      matchAgainst,
      id_clinica,
    ];
    return await ejecutarConReintento(consultaSQL, parametros);
  }

  async getCitasByPacienteId(id_paciente: number, id_clinica: number): Promise<any[]> {
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
      WHERE citas.id_paciente = ? 
        AND citas.id_estado_cita IN (1, 7, 8, 9)
        AND citas.id_clinica = ?
      ORDER BY citas.fecha_cita ASC, citas.hora_inicio ASC
    `;
    return await ejecutarConReintento(query, [id_paciente, id_clinica]);
  }

  async getPresupuestosByPacienteId(id_paciente: number, id_clinica: number): Promise<any[]> {
    const query = `
      SELECT 
        p.id_presupuesto,
        p.fecha,
        p.monto_total,
        p.monto_pagado,
        p.saldo_pendiente,
        p.id_tipo_pago,
        tpp.nombre AS nombre_tipo_pago,
        ep.nombre AS nombre_estado
      FROM presupuestos p
      LEFT JOIN tipo_pago_presupuesto tpp ON p.id_tipo_pago = tpp.id_tipo_pago
      LEFT JOIN estados_presupuestos ep ON p.id_estado = ep.id
      WHERE p.id_paciente = ?
        AND p.id_clinica = ?
        AND p.saldo_pendiente > 0
      ORDER BY p.fecha DESC
    `;
    return await ejecutarConReintento(query, [id_paciente, id_clinica]);
  }

  async getPackBonosSesionesByPacienteId(id_paciente: number): Promise<any[]> {
    const query = `
      SELECT *
      FROM pack_bonos_sesiones
      WHERE id_paciente = ?
    `;
    return await ejecutarConReintento(query, [id_paciente]);
  }

  async getCitasDetallePorPackTratamiento(id_paciente: number, id_clinica: number): Promise<any[]> {
    const query = `
      SELECT id_pack_bono, id_tratamiento, id_cita
      FROM citas
      WHERE id_paciente = ? 
        AND id_pack_bono IS NOT NULL
        AND id_clinica = ?
    `;
    return await ejecutarConReintento(query, [id_paciente, id_clinica]);
  }

  async getPackBonoById(id_pack_bono: number, id_clinica: number): Promise<any | undefined> {
    const query = `
    SELECT id_pack_bono, id_clinica, id_super_clinica, nombre, descripcion, precio
    FROM pack_bonos
    WHERE id_pack_bono = ? AND id_clinica = ?
    LIMIT 1
  `;
    const rows = await ejecutarConReintento(query, [id_pack_bono, id_clinica]);
    return rows[0] || undefined;
  }

  async getPackBonoTratamientos(id_pack_bono: number): Promise<any[]> {
    const query = `
      SELECT id_pack_bono_tratamientos, id_pack_bono, id_par_tratamiento, id_tratamiento, total_sesiones
      FROM pack_bono_tratamientos
      WHERE id_pack_bono = ?
    `;
    return await ejecutarConReintento(query, [id_pack_bono]);
  }
}
