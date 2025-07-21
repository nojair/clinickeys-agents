// packages/core/src/infrastructure/clinic/ClinicRepositoryFactory.ts

import { IClinicRepository } from "@clinickeys-agents/core/domain/clinic";

/**
 * Factoría de repositorios de clínica basada en `clinic_source`.
 * Por ahora solo registra la implementación MySQL (source = "legacy"),
 * pero permite añadir nuevas fuentes sin tocar el resto del código.
 */
export class ClinicRepositoryFactory {
  private readonly registry: Record<string, IClinicRepository>;

  constructor(registry: Record<string, IClinicRepository>) {
    this.registry = registry;
  }

  /**
   * Obtiene el repositorio para la fuente solicitada.
   * Lanza un error si no existe una implementación registrada.
   */
  get(clinicSource: string): IClinicRepository {
    const repo = this.registry[clinicSource];
    if (!repo) throw new Error(`ClinicRepositoryFactory: no repository for source '${clinicSource}'`);
    return repo;
  }
}
