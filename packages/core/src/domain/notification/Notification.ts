// packages/core/src/domain/notification/Notification.ts

import { NotificationDTO, NotificationState } from "./dtos";

/**
 * Entidad de dominio Notification
 * Representa una notificación registrada en el sistema.
 */
export class Notification {
  readonly notificationId: number;
  readonly type: string;
  readonly destinationEntity: string;
  readonly message: string;
  readonly scheduledDate: string; // ISO Date
  readonly scheduledTime: string; // HH:mm:ss
  readonly clinicId: number;
  readonly superClinicId: number;
  readonly state: NotificationState;

  readonly entityDestinationId?: number;
  readonly typeRecipientId?: number;
  readonly payload?: any;
  readonly realSendDate?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly triggerEntity?: string;
  readonly triggerEntityId?: number;

  constructor(dto: NotificationDTO) {
    this.notificationId = dto.notificacionId;
    this.type = dto.type;
    this.destinationEntity = dto.destinationEntity;
    this.message = dto.message;
    this.scheduledDate = dto.scheduledDate;
    this.scheduledTime = dto.scheduledTime;
    this.clinicId = dto.clinicId;
    this.superClinicId = dto.superClinicId;
    this.state = dto.state;
    this.entityDestinationId = dto.entityDestinationId;
    this.typeRecipientId = dto.typeRecipientId;
    this.payload = dto.payload;
    this.realSendDate = dto.realSendDate;
    this.createdAt = dto.createdAt;
    this.updatedAt = dto.updatedAt;
    this.triggerEntity = dto.triggerEntity;
    this.triggerEntityId = dto.triggerEntityId;
  }

  // Métodos de dominio adicionales pueden agregarse aquí si son necesarios.
}
