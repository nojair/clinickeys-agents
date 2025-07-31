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
        createdAt: row.creado_el,
        clinicId: row.id_clinica,
        type: row.tipo_notificacion,
        updatedAt: row.actualizado_el,
        realSendDate: row.fecha_envio_real,
        notificacionId: row.id_notificacion,
        superClinicId: row.id_super_clinica,
        destinationEntity: row.entidad_destino,
        scheduledTime: row.hora_envio_programada,
        scheduledDate: row.fecha_envio_programada,
        typeRecipientId: row.id_tipo_destinatario,
        triggerEntity: row.entidad_desencadenadora,
        entityDestinationId: row.id_entidad_destino,
        triggerEntityId: row.id_entidad_desencadenadora,
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
