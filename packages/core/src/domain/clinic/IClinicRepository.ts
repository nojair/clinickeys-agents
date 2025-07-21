// packages/core/src/domain/clinic/IClinicRepository.ts

import { ClinicDTO } from "./dtos";

/**
 * Contrato para repositorios de clínicas (solo lectura).
 * Apoya múltiples fuentes de datos mediante el parámetro `clinicSource`.
 */
export interface IClinicRepository {
  /**
   * Obtiene una clínica única por fuente e ID.
   */
  findById(clinicSource: string, clinicId: string): Promise<ClinicDTO | null>;

  /**
   * Lista todas las clínicas de una fuente; si `clinicSource` es omitido,
   * devuelve la unión de todas las fuentes soportadas por la implementación.
   */
  findAll(clinicSource?: string): Promise<ClinicDTO[]>;
}
