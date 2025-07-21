// packages/core/src/domain/notification/dtos.ts

/**
 * DTO para la entidad Notification, basado en la tabla 'notificaciones'.
 */

export type NotificationState =
  | 'pendiente'
  | 'enviado'
  | 'fallido'
  | 'no_respondida'
  | 'cancelado'
  | 'error_config'
  | 'omitido';

export interface NotificationDTO {
  id_notificacion: number;
  tipo_notificacion: string;
  id_entidad_destino?: number;
  id_tipo_destinatario?: number;
  entidad_destino: string;
  mensaje: string;
  payload?: any; // JSON
  fecha_envio_programada: string; // ISO Date
  hora_envio_programada: string; // HH:mm:ss
  fecha_envio_real?: string; // ISO DateTime
  estado: NotificationState;
  creado_el: string; // ISO DateTime
  actualizado_el: string; // ISO DateTime
  entidad_desencadenadora?: string;
  id_entidad_desencadenadora?: number;
  id_clinica: number;
  id_super_clinica: number;
  kommo_lead_id?: string; // ID del lead en Kommo
  telefono?: string; // Teléfono del paciente
}
