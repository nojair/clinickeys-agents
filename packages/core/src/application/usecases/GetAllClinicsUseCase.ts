// packages/core/src/application/usecases/GetAllClinicsUseCase.ts

import type { IClinicRepository, ClinicDTO } from "@clinickeys-agents/core/domain/clinic";

/**
 * Use case para obtener todas las clínicas desde el repositorio MySQL.
 */
export class GetAllClinicsUseCase {
  private clinicRepository: IClinicRepository;

  constructor(clinicRepository: IClinicRepository) {
    this.clinicRepository = clinicRepository;
  }

  /**
   * Devuelve todas las clínicas registradas.
   */
  async execute(): Promise<ClinicDTO[]> {
    return this.clinicRepository.findAll();
  }
}
