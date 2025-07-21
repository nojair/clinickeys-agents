// packages/core/src/infrastructure/notification/NotificationRepositoryMySQL.ts

import { Pool, RowDataPacket, OkPacket } from "mysql2/promise";
import { NotificationDTO, NotificationState } from "../../domain/notification/dtos";
import { INotificationRepository } from "../../domain/notification/INotificationRepository";
import { NotificationNotFoundError, NotificationStateUpdateError } from "../../domain/notification/errors";

/**
 * Implementación de INotificationRepository usando MySQL.
 * Recibe un pool de MySQL por parámetro.
 */
export class NotificationRepositoryMySQL implements INotificationRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findPendingByClinic(id_clinica: number, fecha_envio_programada: string): Promise<NotificationDTO[]> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        `SELECT n.*, c.id_paciente, p.*
         FROM notificaciones n
         JOIN citas c ON c.id_cita = n.id_entidad_desencadenadora AND n.entidad_desencadenadora='cita'
         JOIN pacientes p ON p.id_paciente = c.id_paciente
         WHERE n.estado='pendiente'
         AND n.id_clinica=?
         AND n.fecha_envio_programada=?`,
        [id_clinica, fecha_envio_programada]
      );
      if (!rows.length) {
        throw new NotificationNotFoundError(id_clinica);
      }
      return rows as NotificationDTO[];
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
