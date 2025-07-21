// packages/core/src/domain/appointment/dtos.ts

/**
 * DTO para la entidad Appointment.
 * Solo los datos mínimos usados en el JOIN para enriquecer notificaciones.
 */
export interface AppointmentDTO {
  id_cita: number;
  fecha_cita?: string;
  hora_inicio?: string;
  hora_fin?: string;
  id_paciente?: number;
  id_clinica?: number;
}
