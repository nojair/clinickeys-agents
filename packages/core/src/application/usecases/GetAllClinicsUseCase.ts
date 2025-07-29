// packages/core/src/application/usecases/GetAllClinicsUseCase.ts

import type { ClinicRepositoryFactory } from "@clinickeys-agents/core/infrastructure/clinic";
import type { ClinicDTO } from "@clinickeys-agents/core/domain/clinic";

/**
 * Use case para obtener todas las clínicas de una fuente específica (por ahora solo "legacy").
 */
export interface GetAllClinicsUseCaseProps {
  clinicRepositoryFactory: ClinicRepositoryFactory;
  clinicSource: string;
}

export class GetAllClinicsUseCase {
  private readonly factory: ClinicRepositoryFactory;
  private readonly clinicSource: string;

  constructor(props: GetAllClinicsUseCaseProps) {
    this.factory = props.clinicRepositoryFactory;
    this.clinicSource = props.clinicSource;
  }

  /**
   * Devuelve todas las clínicas registradas en la fuente configurada.
   */
  async execute(): Promise<ClinicDTO[]> {
    const repo = this.factory.get(this.clinicSource);
    return repo.findAll(this.clinicSource);
  }
}
