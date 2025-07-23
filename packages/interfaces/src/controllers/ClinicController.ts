// packages/core/src/interface/controllers/ClinicController.ts

import type { ClinicService } from "@clinickeys-agents/core/application/services";
import type { ClinicDTO } from "@clinickeys-agents/core/domain/clinic";

/**
 * Controller para manejar operaciones HTTP/REST relacionadas a clínicas.
 */
export class ClinicController {
  private readonly clinicService: ClinicService;

  constructor(clinicService: ClinicService) {
    this.clinicService = clinicService;
  }

  /**
   * Devuelve la lista de todas las clínicas.
   * Si se especifica `clinicSource`, filtra solo por esa fuente.
   */
  async listGlobalClinics(clinicSource?: string): Promise<ClinicDTO[]> {
    return this.clinicService.listGlobalClinics(clinicSource);
  }

  /**
   * Devuelve los detalles de una clínica por su ID y fuente.
   * Si no se indica `clinicSource`, se asume "legacy".
   */
  async getClinicById(clinicId: string, clinicSource: string = "legacy"): Promise<ClinicDTO | null> {
    return this.clinicService.getClinicById(clinicId, clinicSource);
  }
}
