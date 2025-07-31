// packages/core/src/domain/notification/Notification.ts

import { NotificationDTO, NotificationState } from "./dtos";

/**
 * Entidad de dominio Notification
 * Representa una notificación registrada en el sistema.
 */
export class Notification {
  readonly notificationId: number;
  readonly type: string;
  readonly recipientType: string;
  readonly message: string;
  readonly scheduledDate: string; // ISO Date
  readonly scheduledTime: string; // HH:mm:ss
  readonly clinicId: number;
  readonly superClinicId: number;
  readonly state: NotificationState;

  readonly recipientTypeId?: number;
  readonly recipientId?: number;
  readonly payload?: any;
  readonly realSendDate?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly triggerType?: string;
  readonly triggerTypeId?: number;

  constructor(dto: NotificationDTO) {
    this.state = dto.estado;
    this.message = dto.mensaje;
    this.payload = dto.payload;
    this.clinicId = dto.id_clinica;
    this.createdAt = dto.creado_el;
    this.type = dto.tipo_notificacion;
    this.updatedAt = dto.actualizado_el;
    this.realSendDate = dto.fecha_envio_real;
    this.recipientType = dto.entidad_destino;
    this.superClinicId = dto.id_super_clinica;
    this.notificationId = dto.id_notificacion;
    this.recipientId = dto.id_entidad_destino;
    this.triggerType = dto.entidad_desencadenadora;
    this.scheduledTime = dto.hora_envio_programada;
    this.recipientTypeId = dto.id_tipo_destinatario;
    this.scheduledDate = dto.fecha_envio_programada;
    this.triggerTypeId = dto.id_entidad_desencadenadora;
  }

  // Métodos de dominio adicionales pueden agregarse aquí si son necesarios.
}
