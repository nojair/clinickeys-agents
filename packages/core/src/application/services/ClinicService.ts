// packages/core/src/application/services/ClinicService.ts

import type { IClinicRepository } from "@clinickeys-agents/core/domain/clinic";
import type { ClinicDTO } from "@clinickeys-agents/core/domain/clinic";

/**
 * Servicio de dominio para operaciones con clínicas.
 */
export class ClinicService {
  private readonly clinicRepository: IClinicRepository;

  constructor(clinicRepository: IClinicRepository) {
    this.clinicRepository = clinicRepository;
  }

  /**
   * Devuelve todas las clínicas registradas.
   * Si se pasa `clinicSource`, filtra solo por esa fuente.
   */
  async listGlobalClinics(clinicSource?: string): Promise<ClinicDTO[]> {
    return this.clinicRepository.findAll(clinicSource);
  }

  /**
   * Busca una clínica por su ID.
   * `clinicSource` es opcional y por defecto "legacy" para mantener compatibilidad.
   */
  async getClinicById(clinicId: string, clinicSource: string = "legacy"): Promise<ClinicDTO | null> {
    return this.clinicRepository.findById(clinicSource, clinicId);
  }
}
