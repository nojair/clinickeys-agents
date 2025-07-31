// packages/core/src/infrastructure/notification/NotificationRepositoryMySQL.ts

import { ejecutarConReintento } from "@clinickeys-agents/core/infrastructure/helpers";
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
  async findPendingByClinic(
    clinicId: number,
    fecha_envio_programada: string
  ): Promise<NotificationDTO[]> {
    try {
      const query = `
        SELECT * FROM notificaciones
        WHERE estado = 'pendiente'
        AND id_clinica = ?
        AND fecha_envio_programada = ?
      `;
      const args = [clinicId, fecha_envio_programada]
      const [rows] = await ejecutarConReintento(query, args);
      if (!rows.length) {
        throw new NotificationNotFoundError(clinicId);
      }
      // Mapea los resultados para transformar el payload a tipo NotificationPayload
      return rows.map((row: any) => ({
        state: row.estado,
        message: row.mensaje,
        clinicId: row.id_clinica,
        createdAt: row.creado_el,
        updatedAt: row.actualizado_el,
        type: row.tipo_notificacion,
        realSendDate: row.fecha_envio_real,
        recipientType: row.entidad_destino,
        superClinicId: row.id_super_clinica,
        notificationId: row.id_notificacion,
        recipientId: row.id_entidad_destino,
        triggerType: row.entidad_desencadenadora,
        scheduledTime: row.hora_envio_programada,
        recipientTypeId: row.id_tipo_destinatario,
        scheduledDate: row.fecha_envio_programada,
        triggerTypeId: row.id_entidad_desencadenadora,
        payload: row.payload ? JSON.parse(row.payload) : undefined,
      }));
    } catch (error: any) {
      if (error instanceof NotificationNotFoundError) throw error;
      throw new Error(error.message);
    }
  }

  async updateState(id_notificacion: number, estado: NotificationState): Promise<void> {
    try {
      const query = `UPDATE notificaciones SET estado = ?, actualizado_el = CURRENT_TIMESTAMP WHERE id_notificacion = ?`;
      const args = [estado, id_notificacion];
      const [rows] = await ejecutarConReintento(query, args);
      if (!rows || rows.affectedRows === 0) {
        throw new NotificationStateUpdateError(id_notificacion, estado);
      }
    } catch (error: any) {
      if (error instanceof NotificationStateUpdateError) throw error;
      throw new Error(error.message);
    }
  }
}
