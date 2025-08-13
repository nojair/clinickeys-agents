// /shared/types/dto/clinic.dto.ts

/**
 * Data‑Transfer Object que representa la clínica **tal como** la devuelve
 * el backend (nomenclatura y snake_case incluidos).
 */
export interface ClinicDTO {
  /** Identificador único de la clínica */
  id_clinica: string;

  /** Identificador de la super‑clínica (grupo) */
  id_super_clinica: string;

  /** Nombre comercial */
  nombre: string;

  /**
   * Cualquier campo adicional que el backend incluya (dirección, país, etc.).
   * Se mapea sin alterar en la entidad final si fuera necesario.
   */
  [key: string]: unknown;
}
