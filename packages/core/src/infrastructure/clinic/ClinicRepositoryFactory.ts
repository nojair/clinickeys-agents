import { IClinicRepository } from "@clinickeys-agents/core/domain/clinic";
import { ClinicRepositoryMySQL } from "./ClinicRepositoryMySQL";
import { createMySQLPool, getEnvVar } from "@clinickeys-agents/core/infrastructure/config";

/**
 * Factoría de repositorios de clínica basada en `clinicSource`.
 * Por ahora solo registra la implementación MySQL (source = "legacy"),
 * pero permite añadir nuevas fuentes sin tocar el resto del código.
 */
export class ClinicRepositoryFactory {
  private readonly registry: Record<string, IClinicRepository>;

  constructor() {
    const mysqlPool = createMySQLPool({
      host: getEnvVar("CLINICS_DATA_DB_HOST"),
      user: getEnvVar("CLINICS_DATA_DB_USER"),
      password: getEnvVar("CLINICS_DATA_DB_PASSWORD"),
      database: getEnvVar("CLINICS_DATA_DB_NAME"),
      port: Number(getEnvVar("CLINICS_DATA_DB_PORT")),
      waitForConnections: true,
      connectionLimit: 2,
      queueLimit: 0,
    });

    this.registry = {
      legacy: new ClinicRepositoryMySQL(mysqlPool),
    };
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
