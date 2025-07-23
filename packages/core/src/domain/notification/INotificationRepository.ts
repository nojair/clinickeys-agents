// packages/core/src/domain/notification/INotificationRepository.ts

import { NotificationDTO, NotificationState } from "./dtos";

/**
 * Contrato para acceso a notificaciones en la base de datos.
 */
export interface INotificationRepository {
  /**
   * Obtiene todas las notificaciones pendientes de envío para una clínica específica.
   */
  findPendingByClinic(clinicId: number, fecha_envio_programada: string): Promise<NotificationDTO[]>;

  /**
   * Actualiza el estado de una notificación.
   */
  updateState(id_notificacion: number, estado: NotificationState): Promise<void>;
}
