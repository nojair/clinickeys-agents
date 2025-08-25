import { ejecutarConReintento, ejecutarExecConReintento } from "@clinickeys-agents/core/infrastructure/helpers";
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
      const args = [clinicId, fecha_envio_programada];
      const rows = await ejecutarConReintento(query, args);
      // Mapea los resultados para transformar el payload a tipo NotificationPayload
      return rows.map((row: any) => ({
        estado: row.estado,
        mensaje: row.mensaje,
        creado_el: row.creado_el,
        id_clinica: row.id_clinica,
        actualizado_el: row.actualizado_el,
        id_notificacion: row.id_notificacion,
        entidad_destino: row.entidad_destino,
        fecha_envio_real: row.fecha_envio_real,
        id_super_clinica: row.id_super_clinica,
        tipo_notificacion: row.tipo_notificacion,
        id_entidad_destino: row.id_entidad_destino,
        id_tipo_destinatario: row.id_tipo_destinatario,
        hora_envio_programada: row.hora_envio_programada,
        entidad_desencadenadora: row.entidad_desencadenadora,
        fecha_envio_programada: row.fecha_envio_programada,
        id_entidad_desencadenadora: row.id_entidad_desencadenadora,
        payload: row.payload
          ? typeof row.payload === 'string'
            ? JSON.parse(row.payload)
            : row.payload
          : undefined,
      }));
    } catch (error: any) {
      if (error instanceof NotificationNotFoundError) throw error;
      throw new Error(error.message || 'Error desconocido al obtener notificaciones pendientes');
    }
  }

  async updateState(id_notificacion: number, estado: NotificationState): Promise<void> {
    try {
      const query = `UPDATE notificaciones SET estado = ?, actualizado_el = CURRENT_TIMESTAMP WHERE id_notificacion = ?`;
      const args = [estado, id_notificacion];
      const rows = await ejecutarExecConReintento(query, args);
      if (!rows || rows.affectedRows === 0) {
        throw new NotificationStateUpdateError(id_notificacion, estado);
      }
    } catch (error: any) {
      if (error instanceof NotificationStateUpdateError) throw error;
      throw new Error(error.message || 'Error desconocido al actualizar el estado de la notificación');
    }
  }
}
