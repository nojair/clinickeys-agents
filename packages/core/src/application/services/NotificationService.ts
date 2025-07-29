// packages/core/src/application/services/NotificationService.ts

import { INotificationRepository } from "@clinickeys-agents/core/domain/notification";

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
}
