// packages/core/src/application/usecases/GetPendingNotificationsUseCase.ts

import { INotificationRepository } from "@clinickeys-agents/core/domain/notification";
import { NotificationDTO } from "@clinickeys-agents/core/domain/notification";

export interface GetPendingNotificationsUseCaseProps {
  notificationRepository: INotificationRepository;
}

export class GetPendingNotificationsUseCase {
  private notificationRepository: INotificationRepository;

  constructor(props: GetPendingNotificationsUseCaseProps) {
    this.notificationRepository = props.notificationRepository;
  }

  /**
   * Obtiene todas las notificaciones pendientes para una clínica específica.
   */
  async execute(id_clinica: number, fecha_envio_programada: string): Promise<NotificationDTO[]> {
    return this.notificationRepository.findPendingByClinic(id_clinica, fecha_envio_programada);
  }
}
