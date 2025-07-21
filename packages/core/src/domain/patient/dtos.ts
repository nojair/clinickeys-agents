// packages/core/src/domain/patient/dtos.ts

/**
 * DTO para la entidad Patient.
 * Solo los datos mínimos usados en el JOIN para enriquecer notificaciones.
 */
export interface PatientDTO {
  id_paciente: number;
  nombre: string;
  apellido: string;
  email?: string;
  telefono: string;
}
