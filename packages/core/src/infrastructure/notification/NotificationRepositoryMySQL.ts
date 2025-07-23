// packages/core/src/infrastructure/notification/NotificationRepositoryMySQL.ts

import { Pool, RowDataPacket, OkPacket } from "mysql2/promise";
import {
  NotificationDTO,
  NotificationState,
  INotificationRepository,
  NotificationNotFoundError,
  NotificationStateUpdateError
} from "@clinickeys-agents/core/domain/notification";

/**
 * Implementación de INotificationRepository usando MySQL.
 * Recibe un pool de MySQL por parámetro.
 */
export class NotificationRepositoryMySQL implements INotificationRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findPendingByClinic(
    id_clinica: number,
    fecha_envio_programada: string
  ): Promise<NotificationDTO[]> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        `SELECT * FROM notificaciones
         WHERE estado = 'pendiente'
         AND id_clinica = ?
         AND fecha_envio_programada = ?`,
        [id_clinica, fecha_envio_programada]
      );
      if (!rows.length) {
        throw new NotificationNotFoundError(id_clinica);
      }
      // Mapea los resultados para transformar el payload a tipo NotificationPayload
      return rows.map((row: any) => ({
        id_notificacion: row.id_notificacion,
        tipo_notificacion: row.tipo_notificacion,
        id_entidad_destino: row.id_entidad_destino,
        id_tipo_destinatario: row.id_tipo_destinatario,
        entidad_destino: row.entidad_destino,
        mensaje: row.mensaje,
        payload: row.payload ? JSON.parse(row.payload) : undefined,
        fecha_envio_programada: row.fecha_envio_programada,
        hora_envio_programada: row.hora_envio_programada,
        fecha_envio_real: row.fecha_envio_real,
        estado: row.estado,
        creado_el: row.creado_el,
        actualizado_el: row.actualizado_el,
        entidad_desencadenadora: row.entidad_desencadenadora,
        id_entidad_desencadenadora: row.id_entidad_desencadenadora,
        id_clinica: row.id_clinica,
        id_super_clinica: row.id_super_clinica,
      }));
    } catch (error: any) {
      if (error instanceof NotificationNotFoundError) throw error;
      throw new Error(error.message);
    }
  }

  async updateState(id_notificacion: number, estado: NotificationState): Promise<void> {
    try {
      const [result] = await this.pool.query<OkPacket>(
        `UPDATE notificaciones SET estado = ?, actualizado_el = CURRENT_TIMESTAMP WHERE id_notificacion = ?`,
        [estado, id_notificacion]
      );
      if (!result || result.affectedRows === 0) {
        throw new NotificationStateUpdateError(id_notificacion, estado);
      }
    } catch (error: any) {
      if (error instanceof NotificationStateUpdateError) throw error;
      throw new Error(error.message);
    }
  }
}
