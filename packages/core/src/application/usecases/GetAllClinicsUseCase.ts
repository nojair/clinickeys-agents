// packages/core/src/application/usecases/GetAllClinicsUseCase.ts

import { ClinicService } from "@clinickeys-agents/core/application/services";
import type { ClinicDTO } from "@clinickeys-agents/core/domain/clinic";

/**
 * Use case para obtener todas las clínicas de una fuente específica (por ahora solo "legacy").
 */
export interface GetAllClinicsUseCaseProps {
  clinicService: ClinicService;
  clinicSource: string;
}

export class GetAllClinicsUseCase {
  private readonly clinicService: ClinicService;
  private readonly clinicSource: string;

  constructor(props: GetAllClinicsUseCaseProps) {
    this.clinicService = props.clinicService;
    this.clinicSource = props.clinicSource;
  }

  /**
   * Devuelve todas las clínicas registradas en la fuente configurada.
   */
  async execute(): Promise<ClinicDTO[]> {
    return this.clinicService.listGlobalClinics(this.clinicSource);
  }
}
