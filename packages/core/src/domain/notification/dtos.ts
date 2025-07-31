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

export type NotificationPayload = {
  visit_date: string;
  clinic_name: string;
  visit_end_time: string;
  treatment_name: string;
  visit_init_time: string;
  medic_full_name: string;
  patient_lastname: string;
  visit_space_name: string;
  patient_firstname: string;
  visit_week_day_name: string;
  [key: string]: any;
};

export interface NotificationDTO {
  id_notificacion: number;
  tipo_notificacion: string;
  id_entidad_destino?: number;
  entidad_destino: string;
  id_tipo_destinatario?: number;
  mensaje: string;
  payload?: NotificationPayload;
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
}
