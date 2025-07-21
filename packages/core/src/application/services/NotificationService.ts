// packages/core/src/application/services/NotificationService.ts

import { NotificationDTO, NotificationState } from "../../domain/notification/dtos";
import { INotificationRepository } from "../../domain/notification/INotificationRepository";

export class NotificationService {
  private notificationRepository: INotificationRepository;

  constructor(notificationRepository: INotificationRepository) {
    this.notificationRepository = notificationRepository;
  }

  /**
   * Marca una notificación como enviada.
   */
  async markAsSent(id_notificacion: number): Promise<void> {
    await this.notificationRepository.updateState(id_notificacion, "enviado");
  }

  /**
   * Marca una notificación como fallida.
   */
  async markAsFailed(id_notificacion: number): Promise<void> {
    await this.notificationRepository.updateState(id_notificacion, "fallido");
  }

  /**
   * Devuelve notificaciones pendientes para una clínica.
   */
  async getPendingNotifications(id_clinica: number, fecha_envio_programada: string): Promise<NotificationDTO[]> {
    return this.notificationRepository.findPendingByClinic(id_clinica, fecha_envio_programada);
  }
}
