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
  patient_id: number;
  patient_first_name: string;
  patient_last_name: string;
  patient_phone: string;
  clinic_id: number;
  clinic_name: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_start_time: string; // HH:mm:ss
  appointment_end_time: string; // HH:mm:ss
  appointment_weekday_name: string;
  doctor_id: number;
  doctor_full_name: string;
  treatment_id: number;
  treatment_name: string;
  space_id: number;
  space_name: string;
  [key: string]: any;
};

export interface NotificationDTO {
  id_notificacion: number;
  tipo_notificacion: string;
  id_entidad_destino?: number;
  id_tipo_destinatario?: number;
  entidad_destino: string;
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
  clinicId: number;
  id_super_clinica: number;
}
