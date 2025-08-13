// /entities/clinic/types.ts

/**
 * Tipo de entidad Clínica, para selector y relaciones de bot configs
 */

export interface Clinic {
  clinicId: string | number; // ID principal de la clínica
  superClinicId: string | number; // ID de la super clínica
  name: string; // Nombre de la clínica
  // Agrega aquí otros campos solo si tu backend los provee (ej: address, phone, etc)
}
