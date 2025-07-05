// packages/core/src/notifications/repository/index.ts

import { getPool } from '../../db';

/**
 * Trae notificaciones `pendiente` de la clínica para la fecha local
 */
export async function fetchForClinicOnDate (id_clinica: any, localDateISO: any) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT n.*, c.id_paciente, p.*
       FROM notificaciones n
       JOIN citas c ON c.id_cita = n.id_entidad_desencadenadora AND n.entidad_desencadenadora='cita'
       JOIN pacientes p ON p.id_paciente = c.id_paciente
      WHERE n.estado='pendiente'
        AND n.id_clinica=?
        AND n.fecha_envio_programada=?`,
    [id_clinica, localDateISO],
  );
  return rows;
}

export async function mark (id_notif: any, estado: any) {
  const pool = getPool();
  await pool.execute('UPDATE notificaciones SET estado=?, fecha_envio_real=UTC_TIMESTAMP() WHERE id_notificacion=?', [estado, id_notif]);
}
