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
  patientId: number;
  patientFirstName: string;
  patientLastName: string;
  patient_phone: string;
  clinicId: number;
  clinicName: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentStartTime: string; // HH:mm:ss
  appointmentEndTime: string; // HH:mm:ss
  appointmentWeekdayName: string;
  doctor_id: number;
  doctorFullName: string;
  treatment_id: number;
  treatmentName: string;
  space_id: number;
  spaceName: string;
  [key: string]: any;
};

export interface NotificationDTO {
  notificacionId: number;
  type: string;
  entityDestinationId?: number;
  typeRecipientId?: number;
  destinationEntity: string;
  message: string;
  payload?: NotificationPayload;
  scheduledDate: string; // ISO Date
  scheduledTime: string; // HH:mm:ss
  realSendDate?: string; // ISO DateTime
  state: NotificationState;
  createdAt: string; // ISO DateTime
  updatedAt: string; // ISO DateTime
  triggerEntity?: string;
  triggerEntityId?: number;
  clinicId: number;
  superClinicId: number;
}
