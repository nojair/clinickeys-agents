// packages/core/src/domain/notification/Notification.ts

import { NotificationDTO, NotificationState } from "./dtos";

/**
 * Entidad de dominio Notification
 * Representa una notificación registrada en el sistema.
 */
export class Notification {
  readonly id: number;
  readonly type: string;
  readonly destinationEntity: string;
  readonly message: string;
  readonly scheduledDate: string; // ISO Date
  readonly scheduledTime: string; // HH:mm:ss
  readonly clinicId: number;
  readonly superClinicId: number;
  readonly state: NotificationState;

  readonly idEntityDestination?: number;
  readonly idTypeRecipient?: number;
  readonly payload?: any;
  readonly realSendDate?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly triggerEntity?: string;
  readonly idTriggerEntity?: number;

  constructor(dto: NotificationDTO) {
    this.id = dto.id_notificacion;
    this.type = dto.tipo_notificacion;
    this.destinationEntity = dto.entidad_destino;
    this.message = dto.mensaje;
    this.scheduledDate = dto.fecha_envio_programada;
    this.scheduledTime = dto.hora_envio_programada;
    this.clinicId = dto.id_clinica;
    this.superClinicId = dto.id_super_clinica;
    this.state = dto.estado;
    this.idEntityDestination = dto.id_entidad_destino;
    this.idTypeRecipient = dto.id_tipo_destinatario;
    this.payload = dto.payload;
    this.realSendDate = dto.fecha_envio_real;
    this.createdAt = dto.creado_el;
    this.updatedAt = dto.actualizado_el;
    this.triggerEntity = dto.entidad_desencadenadora;
    this.idTriggerEntity = dto.id_entidad_desencadenadora;
  }

  // Métodos de dominio adicionales pueden agregarse aquí si son necesarios.
}
